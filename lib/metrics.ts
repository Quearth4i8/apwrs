/**
 * Figures the app is allowed to show, all derived from the 30-year station
 * record in lib/generated/climate.json. Anything that cannot be computed from
 * that record, or from the live grid, is absent rather than estimated.
 */
import { STATIONS, type Station, type DailyRow, latestSpei, latestSpi } from "@/lib/climate";
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
  spi3: { value: number; label: string } | null;
  dryDays: number;
}

const monthName = (m: number) => MONTH_ABBR[m - 1];

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
