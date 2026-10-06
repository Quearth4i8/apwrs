/**
 * Should this crop go in the ground on this field, and if not, what instead?
 *
 * Each crop's requirements (lib/crop-calendar.ts) are checked against the
 * user's field profile (lib/field-profile.ts). Climate is judged over the
 * crop's own growing season: the user gives annual figures, and the
 * station's 30-year monthly normals say how those spread over the year — so
 * a field 1 °C warmer than the station is taken to be 1 °C warmer in every
 * month, and a field with 10% more rain to get 10% more in every month.
 *
 * Every check lands as good, caution or bad. Any bad check rules the crop
 * out; timing is separate, so a crop can suit the field but not be due yet.
 */
import type { Station } from "@/lib/climate";
import {
  CALENDAR_CROPS,
  FAMILY_LABEL,
  daysBetween,
  growingSeason,
  inPeriod,
  monthPos,
  periodLabel,
  type CalendarCrop,
  type Range,
} from "@/lib/crop-calendar";
import { GROWTH_STAGES, TEXTURES, type FieldProfile } from "@/lib/field-profile";

export type Level = "good" | "caution" | "bad";

/** Where a value sits against what the crop wants, for a small range bar. */
export interface Scale {
  lo: number;
  hi: number;
  /** Full marks inside. */
  opt: [number, number];
  /** Tolerated inside; omitted where there is no outer band. */
  abs?: [number, number];
  v: number;
}

/** An axis around a range, with a margin either side and the value kept in view. */
function scaleOf(v: number, opt: [number, number], abs?: [number, number]): Scale {
  const a = abs ?? opt;
  const pad = (a[1] - a[0]) * 0.15 || 1;
  return { lo: Math.min(a[0] - pad, v), hi: Math.max(a[1] + pad, v), opt, abs, v };
}

export interface Check {
  key: string;
  group: "Timing" | "Climate" | "Soil" | "Field";
  label: string;
  level: Level;
  /** What the field has, in the crop's terms. */
  value: string;
  /** Why it lands where it does. */
  note: string;
  scale?: Scale;
}

export type Verdict = "plant" | "care" | "wait" | "avoid";

export interface Advice {
  crop: CalendarCrop;
  verdict: Verdict;
  /** 0–1, for ranking crops against each other. */
  score: number;
  checks: Check[];
  /** Sowing period open today. */
  openNow: boolean;
  /** Days until the next sowing period opens, 0 when open. */
  waitDays: number;
  seasonMonths: number[];
  /** The sowing period the advice is about, and the harvest that follows it. */
  sowPeriod: [number, number];
  harvestPeriod: [number, number];
}

const W: Record<Level, number> = { good: 1, caution: 0.5, bad: 0 };

/** Optimal → good, within absolute → caution, outside → bad. */
function inRange(v: number, r: Range): Level {
  if (v >= r.opt[0] && v <= r.opt[1]) return "good";
  if (v >= r.abs[0] && v <= r.abs[1]) return "caution";
  return "bad";
}

/** The user's annual figures, carried onto the crop's season months. */
export function seasonClimate(profile: FieldProfile, station: Station, months: number[]) {
  const n = station.normals;
  const at = months.map((m) => n[m]);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const c = profile.climate;
  const ratio = (season: number, year: number) => (year > 0 ? season / year : 1);
  return {
    temp: c.meanTemperature + (mean(at.map((x) => x.tmean)) - mean(n.map((x) => x.tmean))),
    rain: c.precipitation * ratio(at.reduce((a, x) => a + x.precip, 0), n.reduce((a, x) => a + x.precip, 0)),
    rh: c.relativeHumidity + (mean(at.map((x) => x.rh)) - mean(n.map((x) => x.rh))),
    wind: c.windSpeed * ratio(mean(at.map((x) => x.wind)), mean(n.map((x) => x.wind))),
    radiation: c.solarRadiation * ratio(mean(at.map((x) => x.rs)), mean(n.map((x) => x.rs))),
  };
}

export function advise(crop: CalendarCrop, profile: FieldProfile, station: Station, today = monthPos()): Advice {
  const r = crop.req;
  const season = growingSeason(crop, today);
  const sc = seasonClimate(profile, station, season.months);
  const checks: Check[] = [];
  const irrigated = profile.agriculture.irrigation !== "rainfed";

  /* ── Timing ── */
  const openPeriod = crop.sow.find((s) => inPeriod(today, s));
  const waitDays = openPeriod ? 0 : Math.min(...crop.sow.map((s) => daysBetween(today, s[0])));
  checks.push(
    openPeriod
      ? {
          key: "window",
          group: "Timing",
          label: "Sowing period",
          level: "good",
          value: "Open now",
          note: `Sow ${periodLabel(openPeriod)}; ${daysBetween(today, openPeriod[1])} days left.`,
        }
      : {
          key: "window",
          group: "Timing",
          label: "Sowing period",
          level: waitDays <= 21 ? "caution" : "bad",
          value: `In ${waitDays} days`,
          note: `Next period ${periodLabel(season.sow)}.${waitDays <= 21 ? " Prepare the seedbed now." : ""}`,
        },
  );

  const stage = profile.agriculture.growthStage;
  const occupied = stage === "sown" || stage === "vegetative" || stage === "flowering" || stage === "maturity";
  if (occupied) {
    const label = GROWTH_STAGES.find((g) => g.value === stage)?.label.toLowerCase();
    checks.push({
      key: "stage",
      group: "Timing",
      label: "Field availability",
      level: stage === "maturity" ? "caution" : "bad",
      value: label ?? stage,
      note:
        stage === "maturity"
          ? "The current crop is near harvest; the field frees up soon."
          : "The field is still carrying a crop; plan this for after harvest.",
    });
  }

  /* ── Climate over the season ── */
  const t = inRange(sc.temp, r.temp);
  checks.push({
    key: "temp",
    group: "Climate",
    label: "Mean temperature",
    level: t,
    value: `${sc.temp.toFixed(1)} °C`,
    scale: scaleOf(sc.temp, r.temp.opt, r.temp.abs),
    note:
      t === "good"
        ? `Within the ${r.temp.opt[0]}–${r.temp.opt[1]} °C the crop prefers.`
        : sc.temp < r.temp.opt[0]
          ? `Cooler than its ${r.temp.opt[0]}–${r.temp.opt[1]} °C optimum; slower growth.`
          : `Warmer than its ${r.temp.opt[0]}–${r.temp.opt[1]} °C optimum; heat stress.`,
  });

  let rainLevel = inRange(sc.rain, r.rain);
  let rainNote =
    rainLevel === "good"
      ? `Enough for the ${r.rain.opt[0]}–${r.rain.opt[1]} mm it needs.`
      : sc.rain < r.rain.opt[0]
        ? `Short of the ${r.rain.opt[0]} mm it needs by about ${Math.round(r.rain.opt[0] - sc.rain)} mm.`
        : `More than the ${r.rain.opt[1]} mm it wants; waterlogging and disease risk.`;
  if (irrigated && sc.rain < r.rain.opt[0]) {
    rainLevel = "good";
    rainNote = `About ${Math.round(r.rain.opt[0] - sc.rain)} mm short; ${profile.agriculture.irrigation} irrigation covers it.`;
  }
  checks.push({
    key: "rain",
    group: "Climate",
    label: "Precipitation",
    level: rainLevel,
    value: `${Math.round(sc.rain)} mm`,
    note: rainNote,
    scale: scaleOf(sc.rain, r.rain.opt, r.rain.abs),
  });

  checks.push({
    key: "rh",
    group: "Climate",
    label: "Relative humidity",
    level: sc.rh <= r.rhMax ? "good" : sc.rh <= r.rhMax + 6 ? "caution" : "bad",
    value: `${Math.round(sc.rh)}%`,
    scale: { lo: 30, hi: 100, opt: [30, r.rhMax], abs: [30, Math.min(100, r.rhMax + 6)], v: Math.min(100, Math.max(30, sc.rh)) },
    note: sc.rh <= r.rhMax ? "Low fungal disease pressure." : `Above ${r.rhMax}%: watch for mildew and rots.`,
  });
  checks.push({
    key: "wind",
    group: "Climate",
    label: "Wind speed",
    level: sc.wind <= r.windMax ? "good" : sc.wind <= r.windMax + 1.5 ? "caution" : "bad",
    value: `${sc.wind.toFixed(1)} m/s`,
    scale: { lo: 0, hi: Math.max(r.windMax + 3, sc.wind), opt: [0, r.windMax], abs: [0, r.windMax + 1.5], v: sc.wind },
    note: sc.wind <= r.windMax ? "No lodging risk from mean wind." : "Strong enough to lodge or damage the crop; consider windbreaks.",
  });
  checks.push({
    key: "rs",
    group: "Climate",
    label: "Solar radiation",
    level: sc.radiation >= r.radiationMin ? "good" : sc.radiation >= r.radiationMin * 0.8 ? "caution" : "bad",
    value: `${sc.radiation.toFixed(1)} MJ/m²/d`,
    scale: {
      lo: 0,
      hi: Math.max(30, sc.radiation),
      opt: [r.radiationMin, Math.max(30, sc.radiation)],
      abs: [r.radiationMin * 0.8, Math.max(30, sc.radiation)],
      v: sc.radiation,
    },
    note: sc.radiation >= r.radiationMin ? "Enough light for growth." : `Below the ${r.radiationMin} it needs; weaker yield and quality.`,
  });

  /* ── Soil ── */
  const s = profile.soil;
  const ph = inRange(s.ph, r.ph);
  checks.push({
    key: "ph",
    group: "Soil",
    label: "Soil pH",
    level: ph,
    value: s.ph.toFixed(1),
    scale: scaleOf(s.ph, r.ph.opt, r.ph.abs),
    note:
      ph === "good"
        ? `Within its ${r.ph.opt[0]}–${r.ph.opt[1]} range.`
        : s.ph > r.ph.opt[1]
          ? "Alkaline for this crop; nutrient lock-up (iron, phosphorus) likely."
          : "Acidic for this crop; liming would help.",
  });
  checks.push({
    key: "ec",
    group: "Soil",
    label: "Salinity",
    level: s.salinity <= r.salinity.ok ? "good" : s.salinity < (r.salinity.ok + r.salinity.fail) / 2 ? "caution" : "bad",
    value: `${s.salinity} dS/m`,
    scale: {
      lo: 0,
      hi: Math.max(r.salinity.fail * 0.8, s.salinity),
      opt: [0, r.salinity.ok],
      abs: [0, (r.salinity.ok + r.salinity.fail) / 2],
      v: s.salinity,
    },
    note:
      s.salinity <= r.salinity.ok
        ? `Full yield up to ${r.salinity.ok} dS/m.`
        : `Above its ${r.salinity.ok} dS/m tolerance; expect about ${Math.min(100, Math.round(((s.salinity - r.salinity.ok) / (r.salinity.fail - r.salinity.ok)) * 100))}% yield loss.`,
  });
  const tex = r.texture.good.includes(s.texture) ? "good" : r.texture.ok.includes(s.texture) ? "caution" : "bad";
  checks.push({
    key: "texture",
    group: "Soil",
    label: "Texture",
    level: tex,
    value: TEXTURES.find((x) => x.value === s.texture)?.label ?? s.texture,
    note: tex === "good" ? "A texture it does well on." : tex === "caution" ? "Tolerated, not ideal." : "Poorly suited to this soil.",
  });
  checks.push({
    key: "depth",
    group: "Soil",
    label: "Soil depth",
    level: s.depth >= r.depthMin ? "good" : s.depth >= r.depthMin * 0.7 ? "caution" : "bad",
    value: `${s.depth} cm`,
    scale: {
      lo: 0,
      hi: Math.max(150, s.depth),
      opt: [r.depthMin, Math.max(150, s.depth)],
      abs: [r.depthMin * 0.7, Math.max(150, s.depth)],
      v: s.depth,
    },
    note: s.depth >= r.depthMin ? "Deep enough for its roots." : `Roots want at least ${r.depthMin} cm.`,
  });
  checks.push({
    key: "drainage",
    group: "Soil",
    label: "Drainage",
    level: s.drainage === "poor" ? (r.needsDrainage ? "bad" : "caution") : "good",
    value: s.drainage,
    note:
      s.drainage === "poor"
        ? r.needsDrainage
          ? "Waterlogging kills this crop's roots."
          : "Some waterlogging risk in wet spells."
        : "No waterlogging concern.",
  });
  if (s.organicMatter < 1) {
    checks.push({
      key: "om",
      group: "Soil",
      label: "Organic matter",
      level: "caution",
      value: `${s.organicMatter}%`,
      note: "Low; add manure or compost to hold water and nutrients.",
    });
  }

  /* ── Rotation ── */
  const prev = CALENDAR_CROPS.find((c) => c.id === profile.agriculture.cropType);
  if (prev) {
    const same = prev.id === crop.id;
    const sameFamily = prev.family === crop.family;
    const afterLegume = prev.family === "legume" && crop.family !== "legume";
    checks.push({
      key: "rotation",
      group: "Field",
      label: "Rotation",
      level: same ? "bad" : sameFamily ? "caution" : "good",
      value: `After ${prev.name.toLowerCase()}`,
      note: same
        ? "Same crop again builds up its pests and diseases; rotate."
        : sameFamily
          ? `Another ${FAMILY_LABEL[crop.family].toLowerCase()}; shared pests carry over.`
          : afterLegume
            ? "Follows a legume: it inherits the nitrogen it fixed."
            : "A good break from the previous crop.",
    });
  }

  /* ── Verdict ── */
  const suitability = checks.filter((c) => c.group !== "Timing");
  const anyBad = suitability.some((c) => c.level === "bad");
  const anyCaution = suitability.some((c) => c.level === "caution");
  // A field still carrying a crop is a matter of when, not whether.
  const timingOk = checks.filter((c) => c.group === "Timing").every((c) => c.level === "good");
  const verdict: Verdict = anyBad ? "avoid" : !timingOk ? "wait" : anyCaution ? "care" : "plant";
  const score = suitability.reduce((a, c) => a + W[c.level], 0) / (suitability.length || 1);

  return {
    crop,
    verdict,
    score,
    checks,
    openNow: !!openPeriod,
    waitDays,
    seasonMonths: season.months,
    sowPeriod: openPeriod ?? season.sow,
    harvestPeriod: season.harvest,
  };
}

/**
 * What else could go in: the crops that suit the field, best first — open
 * sowing periods ahead of ones still to come, then by fit.
 */
export function alternatives(current: CalendarCrop, profile: FieldProfile, station: Station, today = monthPos(), n = 3) {
  return CALENDAR_CROPS.filter((c) => c.id !== current.id)
    .map((c) => advise(c, profile, station, today))
    .filter((a) => a.verdict !== "avoid")
    .sort((a, b) => {
      const soon = (x: Advice) => (x.openNow ? 0 : x.waitDays <= 30 ? 1 : 2);
      return soon(a) - soon(b) || b.score - a.score || a.waitDays - b.waitDays;
    })
    .slice(0, n);
}

export const VERDICT: Record<Verdict, { title: string; color: string; icon: "check" | "alert" | "clock" | "x" }> = {
  plant: { title: "Good to plant", color: "#38A88A", icon: "check" },
  care: { title: "Plant with care", color: "#E7A83B", icon: "alert" },
  wait: { title: "Suits your field — not the season yet", color: "#2F7FD1", icon: "clock" },
  avoid: { title: "Not recommended for this field", color: "#D96565", icon: "x" },
};
