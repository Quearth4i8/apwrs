/**
 * Typed access to the generated station record (lib/generated/climate.json),
 * built from the 30-year daily workbooks by `npm run data:build`.
 *
 * Everything here is measured or derived from those records — nothing is
 * sample data.
 */
import raw from "@/lib/generated/climate.json";

export interface MonthRow {
  y: number;
  m: number;
  /** Precipitation total, mm. */
  p: number;
  /** Reference evapotranspiration total, mm. */
  e: number;
  /** Climatic water balance P − ET₀, mm. */
  b: number;
  /** Mean daily maximum temperature, °C. */
  tx: number;
  tm: number;
  /** Mean relative humidity, %. */
  rh: number;
  /** Mean wind speed, m/s. */
  ws: number;
  /** Mean daily solar radiation, MJ/m²/day. */
  rs: number;
  /** Days with ≥ 1 mm. */
  rd: number;
}

export interface DailyRow {
  date: string;
  precip: number;
  tmax: number;
  tmin: number;
  tmean: number;
  et0: number;
  rh: number;
  wind: number;
  /** Modelled root-zone storage, mm (see soilModel). */
  soilStorageMm: number;
  /** Modelled fraction of total available water remaining, 0–1. */
  soilFraction: number;
}

export interface NormalRow {
  month: number;
  precip: number;
  et0: number;
  tmax: number;
  tmean: number;
  rh: number;
  wind: number;
  rs: number;
  rainDays: number;
}

export interface AnnualRow {
  year: number;
  precip: number;
  et0: number;
  balance: number;
  tmax: number;
  minSpei3: number | null;
  meanSpei3: number | null;
  monthsInDrought: number;
}

export interface Station {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  alt: number;
  coverage: { from: string; to: string; days: number; years: number };
  months: MonthRow[];
  spei: Record<string, (number | null)[]>;
  spi: Record<string, (number | null)[]>;
  normals: NormalRow[];
  /** Mean ET₀ by day of year (0-based, 366 entries) across the record. */
  et0ByDoy: number[];
  /** Whole-record daily ET₀ and rainfall, indexed from `from`, no gaps. */
  series: { from: string; et0: number[]; precip: number[] };
  annual: AnnualRow[];
  recent: DailyRow[];
}

export interface Crop {
  id: string;
  name: string;
  nameFr: string;
  plantingMonth: number;
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  lIni: number;
  lDev: number;
  lMid: number;
  lLate: number;
  totalDays: number;
}

interface ClimateFile {
  generatedAt: string;
  source: string;
  soilModel: { fieldCapacityMm: number; wiltingPointMm: number; tawMm: number };
  stations: Station[];
  crops: Crop[];
}

const data = raw as unknown as ClimateFile;

export const STATIONS: Station[] = data.stations;
export const CROPS: Crop[] = data.crops;
export const SOIL_MODEL = data.soilModel;
export const DATA_SOURCE = data.source;
export const COVERAGE = data.stations[0].coverage;

export function station(id: string): Station {
  return STATIONS.find((s) => s.id === id) ?? STATIONS[0];
}

/** Matches a site name from the app's geography to a real station. */
export function stationForSite(siteName: string): Station {
  const hit = STATIONS.find((s) => s.name.toLowerCase() === siteName.toLowerCase());
  return hit ?? STATIONS[0];
}

/* ── Derived read helpers ────────────────────────────────────────────── */

/** The most recent month with a fitted value at the given SPEI scale. */
export function latestSpei(s: Station, scale: 1 | 3 | 6 | 12) {
  const series = s.spei[String(scale)];
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] != null) return { value: series[i] as number, month: s.months[i] };
  }
  return null;
}

/**
 * The fitted value one whole window before the latest, at the same scale.
 *
 * For SPEI-6 that is the preceding non-overlapping half-year: if the record
 * ends in December (JUL–DEC), this returns June (JAN–JUN). The two together
 * split the year without double-counting a month, which is what makes them
 * comparable.
 */
export function priorSpei(s: Station, scale: 1 | 3 | 6 | 12) {
  const series = s.spei[String(scale)];
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] == null) continue;
    const j = i - scale;
    if (j < 0 || series[j] == null) return null;
    return { value: series[j] as number, month: s.months[j] };
  }
  return null;
}

export function latestSpi(s: Station, scale: 1 | 3 | 12) {
  const series = s.spi[String(scale)];
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] != null) return { value: series[i] as number, month: s.months[i] };
  }
  return null;
}

/** Rolling total of a daily field over the last `days` entries. */
export function recentSum(s: Station, field: "precip" | "et0", days: number) {
  return +s.recent.slice(-days).reduce((a, r) => a + r[field], 0).toFixed(1);
}

export function recentMean(s: Station, field: keyof DailyRow, days: number) {
  const slice = s.recent.slice(-days);
  const total = slice.reduce((a, r) => a + (r[field] as number), 0);
  return +(total / slice.length).toFixed(2);
}

/** The same calendar window averaged over the whole record, for anomalies. */
export function normalForWindow(s: Station, days: number) {
  const end = new Date(s.recent[s.recent.length - 1].date);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  const inWindow = (d: Date) => {
    const md = (x: Date) => (x.getMonth() + 1) * 100 + x.getDate();
    const a = md(start);
    const b = md(end);
    const v = md(d);
    return a <= b ? v >= a && v <= b : v >= a || v <= b;
  };

  const byYear = new Map<number, number>();
  for (const row of dailyAll(s)) {
    const d = new Date(row.date);
    if (!inWindow(d)) continue;
    byYear.set(d.getFullYear(), (byYear.get(d.getFullYear()) ?? 0) + row.precip);
  }
  const totals = [...byYear.values()];
  return totals.length ? +(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : null;
}

/**
 * Only the last three years are shipped at daily resolution; the monthly
 * series covers the full 30 years. This returns what daily data exists.
 */
export function dailyAll(s: Station): DailyRow[] {
  return s.recent;
}

/** Percentile rank of a value within the record, 0–100. */
export function percentileOf(values: number[], v: number) {
  const below = values.filter((x) => x < v).length;
  return Math.round((below / values.length) * 100);
}

export { data as climateFile };
