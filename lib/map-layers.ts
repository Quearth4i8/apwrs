/**
 * The fields the map can drape over the region, one per factor the grid
 * carries. Risk keeps its fixed 0–100 ramp; the rest are coloured either on
 * a fixed scale where the index has one (SPEI/SPI: ±2 is the drought
 * threshold region), or on the spread of today's values across the region.
 */

export type LayerKey = "risk" | "ndvi" | "ndwi" | "spei3" | "spi3" | "soilMoisture" | "tmax" | "precip30" | "et030";

type RGB = [number, number, number];

export interface MapLayer {
  key: LayerKey;
  label: string;
  /** Low → high colours, evenly spaced. */
  ramp: string[];
  /** A fixed domain, or null to stretch over today's values. */
  domain: [number, number] | null;
  format: (v: number) => string;
  /** Words for the two ends of the legend. */
  ends: [string, string];
}

export const MAP_LAYERS: MapLayer[] = [
  {
    key: "risk",
    label: "Drought risk",
    ramp: ["#38A88A", "#38A88A", "#E7A83B", "#EE8434", "#D96565", "#D96565"],
    domain: [0, 100],
    format: (v) => `${Math.round(v)} / 100`,
    ends: ["Safe", "Extreme"],
  },
  {
    key: "ndvi",
    label: "Vegetation (NDVI)",
    ramp: ["#A0522D", "#D9B26F", "#F2E8A0", "#9ACD6B", "#3E9B4F", "#1F6B35"],
    domain: null,
    format: (v) => v.toFixed(2),
    ends: ["Bare", "Dense"],
  },
  {
    key: "ndwi",
    label: "Vegetation water (NDWI)",
    ramp: ["#B5651D", "#E3C27A", "#F3EFD2", "#8CC7D9", "#3A8FC4", "#1F4E9E"],
    domain: null,
    format: (v) => v.toFixed(2),
    ends: ["Dry", "Moist"],
  },
  {
    key: "spei3",
    label: "SPEI-3",
    ramp: ["#B2182B", "#EF8A62", "#F7F7F7", "#67A9CF", "#2166AC"],
    domain: [-2, 2],
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`,
    ends: ["Drier", "Wetter"],
  },
  {
    key: "spi3",
    label: "SPI-3",
    ramp: ["#B2182B", "#EF8A62", "#F7F7F7", "#67A9CF", "#2166AC"],
    domain: [-2, 2],
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`,
    ends: ["Drier", "Wetter"],
  },
  {
    key: "soilMoisture",
    label: "Soil moisture",
    ramp: ["#8C510A", "#D8B365", "#F6E8C3", "#80CDC1", "#2BA6B8", "#01665E"],
    domain: null,
    format: (v) => `${(v * 100).toFixed(0)}% vol`,
    ends: ["Dry", "Wet"],
  },
  {
    key: "tmax",
    label: "Max temperature",
    ramp: ["#FFF3B0", "#FDC46B", "#F98C4A", "#E0663F", "#B8282E"],
    domain: null,
    format: (v) => `${v.toFixed(1)} °C`,
    ends: ["Cooler", "Hotter"],
  },
  {
    key: "precip30",
    label: "Rainfall (30 d)",
    ramp: ["#F7FBFF", "#C6DBEF", "#6BAED6", "#2F7FD1", "#08306B"],
    domain: null,
    format: (v) => `${v.toFixed(0)} mm`,
    ends: ["Less", "More"],
  },
  {
    key: "et030",
    label: "Evapotranspiration (30 d)",
    ramp: ["#FFF7D6", "#FDD68A", "#F5A65B", "#E07A3F", "#A8442A"],
    domain: null,
    format: (v) => `${v.toFixed(0)} mm`,
    ends: ["Less", "More"],
  },
];

export const LAYER: Record<LayerKey, MapLayer> = Object.fromEntries(MAP_LAYERS.map((l) => [l.key, l])) as Record<
  LayerKey,
  MapLayer
>;

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Colour at t ∈ [0, 1] along a layer's ramp. */
export function rampAt(ramp: string[], t: number): RGB {
  const stops = ramp.map(hex);
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const [a, b] = [stops[i], stops[i + 1]];
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)) as RGB;
}

/**
 * The domain a layer is coloured over: its fixed scale, or the 2nd–98th
 * percentile of today's values so one odd cell does not wash out the rest.
 */
export function domainOf(layer: MapLayer, values: (number | null)[]): [number, number] | null {
  if (layer.domain) return layer.domain;
  const v = values.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const lo = v[Math.floor(v.length * 0.02)];
  const hi = v[Math.ceil(v.length * 0.98) - 1];
  return hi > lo ? [lo, hi] : [lo - 1, hi + 1];
}
