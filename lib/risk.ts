/**
 * Composite drought risk over a grid.
 *
 * Factors are combined with the entropy weight method (see lib/drought.ts and
 * `formlas and data/entroy_weight_method.png`): each factor map is normalised
 * by direction, scored by information entropy, and weighted by how much it
 * disperses. Nobody picks the weights by hand.
 *
 * The source paper uses NDVI, soil moisture, LST and PET. Two substitutions
 * are made here and are visible in the UI:
 *   • LST  → 2 m maximum air temperature (no thermal satellite feed wired up)
 *   • NDVI → 30-day precipitation total (no optical satellite feed wired up)
 * Both stand in for the same physical signal; swap them for real rasters when
 * a satellite source is connected and the weighting adapts on its own.
 */
import { entropyWeights, type Factor } from "@/lib/drought";

export interface GridCell {
  lat: number;
  lon: number;
  /** 30-day precipitation total, mm. */
  precip30: number | null;
  /** 30-day reference evapotranspiration total, mm. */
  et030: number | null;
  /** Mean daily maximum temperature over the window, °C. */
  tmax: number | null;
  /** Volumetric soil water content, 3–9 cm, m³/m³. */
  soilMoisture: number | null;
}

export interface ScoredCell extends GridCell {
  /** 0–100, higher is worse. */
  risk: number | null;
}

export interface RiskSurface {
  cells: ScoredCell[];
  weights: Record<string, number>;
  entropy: Record<string, number>;
  factors: { key: string; label: string; direction: "positive" | "negative"; note?: string }[];
}

export const FACTOR_META = [
  { key: "precip30", label: "Rainfall (30 d)", direction: "positive" as const, note: "stands in for NDVI" },
  { key: "soilMoisture", label: "Soil moisture", direction: "positive" as const },
  { key: "tmax", label: "Max temperature", direction: "negative" as const, note: "stands in for LST" },
  { key: "et030", label: "Evapotranspiration", direction: "negative" as const },
];

export function scoreGrid(cells: GridCell[]): RiskSurface {
  const factors: Factor[] = FACTOR_META.map((f) => ({
    key: f.key,
    direction: f.direction,
    values: cells.map((c) => c[f.key as keyof GridCell] as number | null),
  }));

  const { weights, entropy, composite } = entropyWeights(factors);

  return {
    // A cell with no soil moisture is water, not dry land: it carries no
    // drought score and paints as a hole in the surface.
    cells: cells.map((c, i) => ({
      ...c,
      risk:
        c.soilMoisture == null || composite[i] == null
          ? null
          : Math.round((1 - composite[i]!) * 100),
    })),
    weights,
    entropy,
    factors: FACTOR_META,
  };
}

/** GeoJSON for the map's fill layer; one square per grid cell. */
export function toGeoJSON(surface: RiskSurface, cellSizeDeg: { lat: number; lon: number }) {
  const halfLat = cellSizeDeg.lat / 2;
  const halfLon = cellSizeDeg.lon / 2;
  return {
    type: "FeatureCollection" as const,
    features: surface.cells
      .filter((c) => c.risk != null)
      .map((c) => ({
        type: "Feature" as const,
        properties: {
          risk: c.risk,
          precip30: c.precip30,
          et030: c.et030,
          tmax: c.tmax,
          soilMoisture: c.soilMoisture,
          lat: c.lat,
          lon: c.lon,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [
            [
              [c.lon - halfLon, c.lat - halfLat],
              [c.lon + halfLon, c.lat - halfLat],
              [c.lon + halfLon, c.lat + halfLat],
              [c.lon - halfLon, c.lat + halfLat],
              [c.lon - halfLon, c.lat - halfLat],
            ],
          ],
        },
      })),
  };
}
