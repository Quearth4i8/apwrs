/**
 * How much water a crop needs, day by day, and when to irrigate — the
 * FAO-56 single crop coefficient method with a root-zone water balance
 * (Allen et al., 1998, ch. 6 and 8).
 *
 *   ETc  = Kc × ET₀                       crop water use, mm/day
 *   Dr,i = Dr,i−1 − Peff − I + ETc        root-zone depletion, mm
 *   TAW  = AW(texture) × Zr               water the roots can reach, mm
 *   RAW  = p × TAW                        what can go before the crop suffers
 *
 * Irrigate when Dr passes RAW, by enough to refill the root zone; the gross
 * amount allows for the irrigation system's losses. Kc follows the crop's
 * four growth stages from the sowing date; roots deepen over the first two.
 */
import type { Station } from "@/lib/climate";
import type { CalendarCrop, Texture } from "@/lib/crop-calendar";
import type { FieldProfile, Irrigation } from "@/lib/field-profile";

export interface CropWater {
  kc: { ini: number; mid: number; end: number };
  /** Stage lengths, days: initial, development, mid-season, late season. */
  stages: [number, number, number, number];
  /** Maximum rooting depth, m. */
  rootMax: number;
  /** Depletion fraction p: share of TAW the crop can use before stress. */
  p: number;
}

/**
 * Six crops carry the project's agronomist values (lib/generated/climate.json);
 * the other six are FAO-56 Tables 11, 12 and 22 for Mediterranean sowings.
 */
export const CROP_WATER: Record<string, CropWater> = {
  barley: { kc: { ini: 0.3, mid: 1.15, end: 0.25 }, stages: [30, 140, 40, 30], rootMax: 1.2, p: 0.55 },
  colza: { kc: { ini: 0.35, mid: 1.05, end: 0.35 }, stages: [35, 60, 60, 35], rootMax: 1.0, p: 0.6 },
  garlic: { kc: { ini: 0.7, mid: 1.0, end: 0.7 }, stages: [30, 40, 80, 30], rootMax: 0.4, p: 0.3 },
  lentil: { kc: { ini: 0.4, mid: 1.1, end: 0.3 }, stages: [25, 35, 70, 40], rootMax: 0.8, p: 0.5 },
  oats: { kc: { ini: 0.3, mid: 1.15, end: 0.4 }, stages: [30, 140, 40, 30], rootMax: 1.0, p: 0.55 },
  pea: { kc: { ini: 0.4, mid: 1.15, end: 0.35 }, stages: [30, 50, 50, 30], rootMax: 0.8, p: 0.35 },
  "red-beet": { kc: { ini: 0.5, mid: 1.05, end: 0.95 }, stages: [25, 30, 25, 10], rootMax: 0.7, p: 0.5 },
  sunflower: { kc: { ini: 0.35, mid: 1.0, end: 0.35 }, stages: [25, 35, 45, 25], rootMax: 1.0, p: 0.45 },
  tomato: { kc: { ini: 0.7, mid: 1.15, end: 0.8 }, stages: [30, 40, 45, 30], rootMax: 1.0, p: 0.4 },
  triticale: { kc: { ini: 0.3, mid: 1.15, end: 0.25 }, stages: [30, 120, 40, 30], rootMax: 1.2, p: 0.55 },
  "wheat-bread": { kc: { ini: 0.4, mid: 1.15, end: 0.3 }, stages: [30, 140, 40, 30], rootMax: 1.2, p: 0.55 },
  "wheat-durum": { kc: { ini: 0.7, mid: 1.15, end: 0.3 }, stages: [30, 140, 40, 30], rootMax: 1.2, p: 0.55 },
};

export const STAGE_NAMES = ["Initial", "Development", "Mid-season", "Late season"] as const;

/** Available water per metre of soil, mm/m (FAO-56 Table 19, mid-range). */
const AW: Record<Texture, number> = { sand: 70, "sandy-loam": 120, loam: 160, "clay-loam": 180, clay: 190 };

/** Application efficiency: share of the water applied that reaches the roots. */
export const EFFICIENCY: Record<Irrigation, number> = { rainfed: 1, drip: 0.9, sprinkler: 0.75, surface: 0.6 };

export function seasonDays(w: CropWater) {
  return w.stages.reduce((a, b) => a + b, 0);
}

/** Kc on day `d` after sowing (FAO-56 Fig. 25: flat, rising, flat, falling). */
export function kcAt(w: CropWater, d: number): number {
  const [i, dev, mid, late] = w.stages;
  if (d < i) return w.kc.ini;
  if (d < i + dev) return w.kc.ini + ((d - i) / dev) * (w.kc.mid - w.kc.ini);
  if (d < i + dev + mid) return w.kc.mid;
  if (d < i + dev + mid + late) return w.kc.mid + ((d - i - dev - mid) / late) * (w.kc.end - w.kc.mid);
  return w.kc.end;
}

export function stageAt(w: CropWater, d: number): number {
  let acc = 0;
  for (let s = 0; s < 4; s++) {
    acc += w.stages[s];
    if (d < acc) return s;
  }
  return 4; // past harvest
}

/** Roots grow from 15 cm at sowing to full depth by the end of development. */
function rootAt(w: CropWater, d: number, soilDepthM: number): number {
  const full = w.stages[0] + w.stages[1];
  const z = 0.15 + Math.min(1, Math.max(0, d / full)) * (w.rootMax - 0.15);
  return Math.min(z, Math.max(0.15, soilDepthM));
}

/** Rain that stays in the root zone: light showers evaporate off the surface. */
function effectiveDaily(p: number) {
  return p >= 2 ? 0.8 * p : 0;
}

/** USDA-SCS effective rain for a month total, mm. */
export function effectiveMonthly(p: number) {
  return p <= 250 ? (p * (125 - 0.2 * p)) / 125 : 125 + 0.1 * p;
}

export interface DayInput {
  date: string;
  precip: number | null;
  et0: number | null;
  forecast: boolean;
}

export interface WaterDay {
  date: string;
  dayAfterSowing: number;
  stage: number;
  kc: number;
  et0: number;
  /** Crop water use, mm. */
  etc: number;
  rain: number;
  effectiveRain: number;
  taw: number;
  raw: number;
  /** Depletion at the end of the day, after any irrigation, mm. */
  depletion: number;
  /** Net irrigation to apply today, mm (0 if none). */
  irrigateNet: number;
  /** The same, allowing for the system's losses, mm. */
  irrigateGross: number;
  /** Where the weather came from. */
  source: "observed" | "forecast" | "climate";
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAY = 86_400_000;

/**
 * The water balance from sowing to the end of the forecast. Days the
 * forecast feed does not cover are filled from the station's 30-year means
 * (daily ET₀ by day of year, rain as each month's effective share), so a
 * crop sown months ago still starts from the right place.
 */
export function runWater(
  crop: CalendarCrop,
  sowDate: string,
  days: DayInput[],
  profile: FieldProfile,
  station: Station,
): WaterDay[] {
  const w = CROP_WATER[crop.id];
  if (!w) return [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const last = days.length ? days[days.length - 1].date : iso(new Date());
  const start = Date.parse(`${sowDate}T00:00:00Z`);
  const end = Math.min(Date.parse(`${last}T00:00:00Z`), start + (seasonDays(w) - 1) * DAY);
  const aw = AW[profile.soil.texture];
  const soilM = profile.soil.depth / 100;
  const eff = EFFICIENCY[profile.agriculture.irrigation];
  const irrigated = profile.agriculture.irrigation !== "rainfed";

  const out: WaterDay[] = [];
  let depletion = 0; // the field starts at field capacity after seedbed preparation
  for (let t = start, d = 0; t <= end; t += DAY, d++) {
    const date = iso(new Date(t));
    const row = byDate.get(date);
    const dt = new Date(t);
    const doy = Math.floor((t - Date.UTC(dt.getUTCFullYear(), 0, 1)) / DAY);
    const month = dt.getUTCMonth();
    const dim = new Date(Date.UTC(dt.getUTCFullYear(), month + 1, 0)).getUTCDate();

    const et0 = row?.et0 ?? station.et0ByDoy[Math.min(365, doy)] ?? 0;
    const rain = row ? (row.precip ?? 0) : station.normals[month].precip / dim;
    const effectiveRain = row ? effectiveDaily(rain) : effectiveMonthly(station.normals[month].precip) / dim;

    const kc = kcAt(w, d);
    const etc = kc * et0;
    const taw = aw * rootAt(w, d, soilM);
    const raw = w.p * taw;

    depletion = Math.max(0, depletion - effectiveRain + etc);
    let irrigateNet = 0;
    if (depletion > raw) {
      if (irrigated) {
        irrigateNet = depletion;
        depletion = 0;
      } else {
        depletion = Math.min(depletion, taw); // rainfed: the crop simply stresses
      }
    }

    out.push({
      date,
      dayAfterSowing: d,
      stage: stageAt(w, d),
      kc,
      et0,
      etc,
      rain,
      effectiveRain,
      taw,
      raw,
      depletion,
      irrigateNet,
      irrigateGross: irrigateNet / eff,
      source: row ? (row.forecast ? "forecast" : "observed") : "climate",
    });
  }
  return out;
}

/**
 * A whole season in monthly steps from 30-year means: what the crop will
 * use, what the rain gives, and the irrigation that makes up the rest.
 */
export function seasonPlan(crop: CalendarCrop, sowDate: string, station: Station, profile: FieldProfile) {
  const w = CROP_WATER[crop.id];
  if (!w) return [];
  const start = Date.parse(`${sowDate}T00:00:00Z`);
  const months = new Map<string, { label: string; etc: number; rain: number; days: number; month: number; year: number }>();
  for (let d = 0; d < seasonDays(w); d++) {
    const dt = new Date(start + d * DAY);
    const m = dt.getUTCMonth();
    const key = `${dt.getUTCFullYear()}-${m}`;
    const doy = Math.floor((dt.getTime() - Date.UTC(dt.getUTCFullYear(), 0, 1)) / DAY);
    const dim = new Date(Date.UTC(dt.getUTCFullYear(), m + 1, 0)).getUTCDate();
    const cur = months.get(key) ?? { label: key, etc: 0, rain: 0, days: 0, month: m, year: dt.getUTCFullYear() };
    cur.etc += kcAt(w, d) * (station.et0ByDoy[Math.min(365, doy)] ?? 0);
    cur.rain += effectiveMonthly(station.normals[m].precip) / dim;
    cur.days++;
    months.set(key, cur);
  }
  const eff = EFFICIENCY[profile.agriculture.irrigation];
  return [...months.values()].map((m) => {
    const need = Math.max(0, m.etc - m.rain);
    return { ...m, need, gross: need / eff };
  });
}

export interface EtcDay {
  date: string;
  dayAfterSowing: number;
  stage: number;
  kc: number;
  et0: number;
  etc: number;
  source: "observed" | "forecast" | "climate";
}

/**
 * Crop water use for every day of the season, sowing to harvest. Real ET₀
 * where the weather feed has the day (recent past and forecast); the
 * station's 1996–2025 mean for that day of the year everywhere else.
 */
export function seasonEtc(crop: CalendarCrop, sowDate: string, days: DayInput[], station: Station): EtcDay[] {
  const w = CROP_WATER[crop.id];
  if (!w) return [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const start = Date.parse(`${sowDate}T00:00:00Z`);
  const out: EtcDay[] = [];
  for (let d = 0; d < seasonDays(w); d++) {
    const t = start + d * DAY;
    const dt = new Date(t);
    const date = iso(dt);
    const row = byDate.get(date);
    const doy = Math.floor((t - Date.UTC(dt.getUTCFullYear(), 0, 1)) / DAY);
    const et0 = row?.et0 ?? station.et0ByDoy[Math.min(365, doy)] ?? 0;
    const kc = kcAt(w, d);
    out.push({
      date,
      dayAfterSowing: d,
      stage: stageAt(w, d),
      kc,
      et0,
      etc: kc * et0,
      source: row?.et0 != null ? (row.forecast ? "forecast" : "observed") : "climate",
    });
  }
  return out;
}
