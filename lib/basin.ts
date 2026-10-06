/**
 * The Ichkeul catchment (bassin versant): ERA5-Land soil water, rain and
 * temperature averaged over its 29 grid sections, built by
 * `npm run data:basin` from ichkeul-soil-moisture/. The section shapes for
 * the map are in public/data/basin.geojson and are fetched, not bundled.
 *
 * ERA5-Land is a land-surface model, not a measurement, so the percentile —
 * this month against the same month in 1991–2020 — is the reading to trust,
 * more than the absolute amount of water.
 */
import raw from "@/lib/generated/basin.json";

export interface BasinLayer {
  key: string;
  label: string;
  cm: number;
  pct: (number | null)[];
  vol: (number | null)[];
}

export interface Basin {
  generatedAt: string;
  source: string;
  fetchedOn: string;
  areaKm2: number;
  sections: number;
  /** "YYYY-MM", oldest first; every series below is indexed like it. */
  months: string[];
  rain: (number | null)[];
  rainNormal: (number | null)[];
  temp: (number | null)[];
  /** Water held in the 0–100 cm root zone, mm. */
  reserveMm: (number | null)[];
  reserveNormalMm: (number | null)[];
  reservePct: (number | null)[];
  layers: BasinLayer[];
}

export const BASIN = raw as Basin;

/** Soil-water percentile classes, dry to wet, as on the map legend. */
export const WATER_CLASSES = [
  { max: 10, label: "Very dry", color: "#D96565" },
  { max: 30, label: "Dry", color: "#E7A83B" },
  { max: 70, label: "Normal", color: "#8FBF9F" },
  { max: 90, label: "Wet", color: "#2BA6B8" },
  { max: 101, label: "Very wet", color: "#2F7FD1" },
] as const;

export function waterClass(pct: number | null) {
  if (pct == null) return null;
  return WATER_CLASSES.find((c) => pct < c.max) ?? WATER_CLASSES[WATER_CLASSES.length - 1];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-07" → "Jul 2026", or "Jul" with `short`. */
export function monthLabel(ym: string, short = false) {
  const [y, m] = ym.split("-").map(Number);
  return short ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`;
}
