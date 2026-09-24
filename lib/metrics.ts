/**
 * Figures the app is allowed to show, all derived from the 30-year station
 * record in lib/generated/climate.json. Anything that cannot be computed from
 * that record, or from the live grid, is absent rather than estimated.
 */
import { STATIONS, type Station, type Crop, type DailyRow, latestSpei, priorSpei, latestSpi } from "@/lib/climate";
import raw from "@/lib/generated/climate.json";

export interface DecadeSuitability {
  decade: number;
  establishmentProb: number;
  rainfedCoverage: number;
  heatDays: number;
  frostDays: number;
  etcMm: number;
  rainMm: number;
  water: "reliable" | "marginal" | "irrigation-dependent";
  years: number;
}

interface PlantingFile {
  planting: { stationId: string; crops: { cropId: string; decades: DecadeSuitability[] }[] }[];
}

const planting = (raw as unknown as PlantingFile).planting;

export function suitability(stationId: string, cropId: string): DecadeSuitability[] {
  return planting.find((p) => p.stationId === stationId)?.crops.find((c) => c.cropId === cropId)?.decades ?? [];
}

export const WATER_CLASS: Record<
  DecadeSuitability["water"],
  { label: string; color: string; fill: string }
> = {
  reliable: { label: "Rain reliable", color: "#38A88A", fill: "rgb(56 168 138 / 0.30)" },
  marginal: { label: "Marginal", color: "#E7A83B", fill: "rgb(231 168 59 / 0.26)" },
  "irrigation-dependent": {
    label: "Needs irrigation",
    color: "#D96565",
    fill: "rgb(217 101 101 / 0.26)",
  },
};

/** Ten-day period index to a readable date label. */
export function decadeLabel(decade: number) {
  const start = new Date(Date.UTC(2001, 0, 1));
  start.setUTCDate(start.getUTCDate() + decade * 10);
  return start.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];


/**
 * Ranking a sowing period for a given crop.
 *
 * `establishmentProb` counts rain in the 21 days after sowing, which involves
 * no crop term at all — it is a property of the date. Ranking on it first
 * therefore returned the same "best" period for every crop, which looked like
 * a hard-coded value because it may as well have been one.
 *
 * The crop-dependent quantity is rainfed coverage: cycle rainfall against the
 * cycle's ETc, and ETc comes from the crop's own Kc curve and cycle length. A
 * crop needs both — to germinate, and then to be carried to harvest — so the
 * score is their product, readable as "chance of establishing x share of the
 * water demand rain actually met".
 */
export function periodScore(d: DecadeSuitability): number {
  return d.establishmentProb * d.rainfedCoverage;
}

/** The best sowing period for this crop, by that score. */
export function bestPeriod(stationId: string, cropId: string): DecadeSuitability | null {
  const decades = suitability(stationId, cropId);
  if (!decades.length) return null;
  return [...decades].sort((a, b) => periodScore(b) - periodScore(a))[0];
}

/* ── Season calendar layout ──────────────────────────────────────────── */

/**
 * The agricultural year here starts in September, not January: the decisive
 * decisions are autumn sowings, and a calendar that splits them across two
 * rows of the chart hides the thing the page exists to show. Decade 24
 * begins 3 September.
 */
export const SEASON_START_DECADE = 24;
export const DECADES_PER_YEAR = 36;

/** Decade indices in season order, starting at September. */
export function seasonOrder(): number[] {
  return Array.from(
    { length: DECADES_PER_YEAR },
    (_, i) => (SEASON_START_DECADE + i) % DECADES_PER_YEAR,
  );
}

/** Mid-point date of a ten-day period, used for labels and grouping. */
export function decadeDate(decade: number): Date {
  const d = new Date(Date.UTC(2001, 0, 1));
  d.setUTCDate(d.getUTCDate() + decade * 10 + 5);
  return d;
}

/** Month header cells for the season grid: label plus how many decades it spans. */
export function seasonMonths(): { label: string; span: number }[] {
  const out: { label: string; span: number }[] = [];
  for (const dec of seasonOrder()) {
    const label = MONTH_ABBR[decadeDate(dec).getUTCMonth()];
    const last = out[out.length - 1];
    if (last && last.label === label) last.span += 1;
    else out.push({ label, span: 1 });
  }
  return out;
}

/** The ten-day period containing today. */
export function currentDecade(now = new Date()): number {
  const doy = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(now.getUTCFullYear(), 0, 1)) /
      86_400_000,
  );
  return Math.min(DECADES_PER_YEAR - 1, Math.floor(doy / 10));
}

/** How many ten-day periods until a decade comes round again. */
export function decadesUntil(target: number, from = currentDecade()): number {
  return (target - from + DECADES_PER_YEAR) % DECADES_PER_YEAR;
}

/** Contiguous runs of one class, in season order — the bands on the chart. */
export function bands(decades: DecadeSuitability[]): {
  water: DecadeSuitability["water"];
  start: number;
  span: number;
  first: DecadeSuitability;
}[] {
  const byDecade = new Map(decades.map((d) => [d.decade, d]));
  const out: { water: DecadeSuitability["water"]; start: number; span: number; first: DecadeSuitability }[] = [];
  seasonOrder().forEach((dec, i) => {
    const row = byDecade.get(dec);
    if (!row) return;
    const last = out[out.length - 1];
    if (last && last.water === row.water && last.start + last.span === i) last.span += 1;
    else out.push({ water: row.water, start: i, span: 1, first: row });
  });
  return out;
}

/**
 * The crop's longest unbroken run of rain-reliable sowing periods.
 *
 * This is the figure that actually separates the crops: a single best period
 * lands on the same date for most of them, because autumn is simply when the
 * rain arrives, whereas how long that window stays open depends on the
 * crop's own cycle length and water demand — 40 days for durum wheat here,
 * 170 for faba bean.
 */
export function reliableWindow(stationId: string, cropId: string) {
  const runs = bands(suitability(stationId, cropId)).filter((r) => r.water === "reliable");
  if (!runs.length) return null;
  const best = runs.reduce((a, b) => (b.span > a.span ? b : a));
  const order = seasonOrder();
  return {
    startDecade: order[best.start],
    endDecade: order[(best.start + best.span - 1) % DECADES_PER_YEAR],
    periods: best.span,
    days: best.span * 10,
    runs: runs.length,
    /** Highest-scoring period inside the window. */
    peak: suitability(stationId, cropId)
      .filter((d) => {
        const i = order.indexOf(d.decade);
        return i >= best.start && i < best.start + best.span;
      })
      .sort((a, b) => periodScore(b) - periodScore(a))[0],
  };
}

/** Where a crop stands today, and when its next reliable period opens. */
export function cropStatus(stationId: string, cropId: string) {
  const decades = suitability(stationId, cropId);
  const today = currentDecade();
  const here = decades.find((d) => d.decade === today) ?? null;
  const reliable = decades
    .filter((d) => d.water === "reliable")
    .map((d) => ({ d, wait: decadesUntil(d.decade, today) }))
    .sort((a, b) => a.wait - b.wait);
  const next = reliable[0] ?? null;
  return {
    here,
    next: next?.d ?? null,
    /** Days until the next reliable period, 0 when one is open now. */
    waitDays: next ? next.wait * 10 : null,
    openNow: here?.water === "reliable",
  };
}

/* ── Daily crop water demand (FAO-56) ────────────────────── */

/**
 * FAO-56 single crop coefficient curve, the same one the ETL scores against
 * (scripts/build-data.ts). Flat at Kc_ini through the initial stage, linear to
 * Kc_mid across development, flat through mid-season, then linear to Kc_end.
 *
 * Note this is deliberately not the curve in the workbook's own ETc sheet,
 * which holds Kc at Kc_mid from development right through to harvest and never
 * uses Kc_end at all. That is not FAO-56.
 */
export function kcAt(crop: Crop, dayOfCycle: number): number {
  const { kcIni, kcMid, kcEnd, lIni, lDev, lMid, lLate } = crop;
  if (dayOfCycle < lIni) return kcIni;
  if (dayOfCycle < lIni + lDev) return kcIni + ((kcMid - kcIni) * (dayOfCycle - lIni)) / lDev;
  if (dayOfCycle < lIni + lDev + lMid) return kcMid;
  const intoLate = dayOfCycle - (lIni + lDev + lMid);
  return kcMid + ((kcEnd - kcMid) * intoLate) / Math.max(1, lLate);
}

/**
 * Mean ET₀ for a calendar day, from the record's day-of-year climatology.
 *
 * The ETL averages every 1 January, every 2 January and so on across the
 * whole record, so this is daily resolution rather than a monthly step —
 * which is what keeps a cycle total here consistent with the replayed
 * planting figures instead of drifting a few percent from them.
 */
export function normalDailyEt0(station: Station, date: Date): number {
  const doy = Math.floor(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(date.getUTCFullYear(), 0, 1)) /
      86_400_000,
  );
  return station.et0ByDoy[Math.max(0, Math.min(365, doy))] ?? 0;
}

export interface EtcDay {
  /** 0-based day of the crop cycle. */
  day: number;
  /** Calendar date this day falls on, given the sowing period. */
  date: Date;
  kc: number;
  /** Climatological ET₀ for that date, mm/day. */
  et0: number;
  /** Kc × ET₀, mm/day. */
  etc: number;
  /** Running total since sowing, mm. */
  cumulative: number;
}

/**
 * Daily ETc across a crop cycle sown at a given ten-day period.
 *
 * ET₀ comes from the 30-year monthly normals rather than one particular
 * season, so the curve reads as the expected demand for that sowing date
 * rather than what one year happened to do.
 */
export function etcCurve(station: Station, crop: Crop, sowDecade: number): EtcDay[] {
  // The first day of the ten-day period, not its midpoint: this is where the
  // ETL starts each replayed cycle (startDoy = decade * 10) and what
  // decadeLabel() prints. Using decadeDate() here would shift the whole cycle
  // five days later and inflate the total by a few percent.
  const start = new Date(Date.UTC(2001, 0, 1));
  start.setUTCDate(start.getUTCDate() + sowDecade * 10);
  const out: EtcDay[] = [];
  let cumulative = 0;
  for (let day = 0; day < crop.totalDays; day++) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + day);
    const kc = kcAt(crop, day);
    const et0 = normalDailyEt0(station, date);
    const etc = kc * et0;
    cumulative += etc;
    out.push({ day, date, kc, et0, etc, cumulative });
  }
  return out;
}

/* ── Station condition summary ───────────────────────────────────────── */

export interface Conditions {
  station: Station;
  /** Most recent day in the record. */
  asOf: string;
  rain30: number;
  rain30Normal: number | null;
  rain30Anomaly: number | null;
  et030: number;
  balance30: number;
  soilStorageMm: number;
  soilFraction: number;
  tmax7: number;
  spei3: { value: number; label: string } | null;
  /** Six-month SPEI, with the accumulation window it covers. */
  spei6: { value: number; label: string; window: string } | null;
  /** The preceding non-overlapping half-year, for comparison. */
  spei6Prior: { value: number; window: string } | null;
  spi3: { value: number; label: string } | null;
  dryDays: number;
}

const monthName = (m: number) => MONTH_ABBR[m - 1];

/**
 * The months a standardized index actually accumulates over, e.g. SPEI-6
 * reported for December 2025 covers "JUL–DEC 2025". Worth stating: the same
 * headline month means a different span at each timescale, which is the whole
 * reason for showing more than one.
 */
function spanLabel(end: { y: number; m: number }, scale: number): string {
  const d = new Date(Date.UTC(end.y, end.m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - (scale - 1));
  const sy = d.getUTCFullYear();
  const sm = d.getUTCMonth() + 1;
  return sy === end.y
    ? `${monthName(sm)}–${monthName(end.m)} ${end.y}`
    : `${monthName(sm)} ${sy}–${monthName(end.m)} ${end.y}`;
}

/** Descriptive band for a standardized index, per the usual SPEI/SPI scale. */
export function indexBand(v: number) {
  if (v <= -2) return "extremely dry";
  if (v <= -1.5) return "severely dry";
  if (v <= -1) return "moderately dry";
  if (v < 1) return "near normal";
  if (v < 1.5) return "moderately wet";
  if (v < 2) return "severely wet";
  return "extremely wet";
}

export function conditionsFor(station: Station): Conditions {
  const recent = station.recent;
  const last = recent[recent.length - 1];
  const window = recent.slice(-30);

  const rain30 = +window.reduce((a, r) => a + r.precip, 0).toFixed(1);
  const et030 = +window.reduce((a, r) => a + r.et0, 0).toFixed(1);

  // The same 30-day calendar window, averaged across every year on record.
  const end = new Date(last.date);
  const startMd = new Date(end);
  startMd.setDate(startMd.getDate() - 29);
  const md = (d: Date) => (d.getMonth() + 1) * 100 + d.getDate();
  const a = md(startMd);
  const b = md(end);
  const inWindow = (d: Date) => {
    const v = md(d);
    return a <= b ? v >= a && v <= b : v >= a || v <= b;
  };

  const byYear = new Map<number, number>();
  for (const row of allDaily(station)) {
    const d = new Date(row.date);
    if (!inWindow(d)) continue;
    byYear.set(d.getFullYear(), (byYear.get(d.getFullYear()) ?? 0) + row.precip);
  }
  const totals = [...byYear.values()];
  const rain30Normal = totals.length > 1 ? +(totals.reduce((x, y) => x + y, 0) / totals.length).toFixed(1) : null;

  let dryDays = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].precip >= 1) break;
    dryDays++;
  }

  const spei = latestSpei(station, 3);
  const spei6 = latestSpei(station, 6);
  const spei6Prior = priorSpei(station, 6);
  const spi = latestSpi(station, 3);

  return {
    station,
    asOf: last.date,
    rain30,
    rain30Normal,
    rain30Anomaly: rain30Normal ? +(((rain30 - rain30Normal) / rain30Normal) * 100).toFixed(0) : null,
    et030,
    balance30: +(rain30 - et030).toFixed(1),
    soilStorageMm: last.soilStorageMm,
    soilFraction: last.soilFraction,
    tmax7: +(recent.slice(-7).reduce((x, r) => x + r.tmax, 0) / 7).toFixed(1),
    spei3: spei ? { value: spei.value, label: `${monthName(spei.month.m)} ${spei.month.y}` } : null,
    spei6: spei6
      ? {
          value: spei6.value,
          label: `${monthName(spei6.month.m)} ${spei6.month.y}`,
          window: spanLabel(spei6.month, 6),
        }
      : null,
    spei6Prior: spei6Prior
      ? { value: spei6Prior.value, window: spanLabel(spei6Prior.month, 6) }
      : null,
    spi3: spi ? { value: spi.value, label: `${monthName(spi.month.m)} ${spi.month.y}` } : null,
    dryDays,
  };
}

/** Only three years ship at daily resolution; this returns what exists. */
export function allDaily(station: Station): DailyRow[] {
  return station.recent;
}

/* ── Historical position ─────────────────────────────────────────────── */

/** Where a year's rainfall sits in the 30-year record. */
export function rainfallPercentile(station: Station, year: number) {
  const totals = station.annual.map((a) => a.precip);
  const target = station.annual.find((a) => a.year === year)?.precip;
  if (target == null) return null;
  const below = totals.filter((v) => v < target).length;
  return Math.round((below / totals.length) * 100);
}

export function driestYears(station: Station, n = 5) {
  return [...station.annual].sort((x, y) => x.balance - y.balance).slice(0, n);
}

export { STATIONS };
