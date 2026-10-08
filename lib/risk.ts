/**
 * Composite drought risk over a grid.
 *
 * Factors are combined with the entropy weight method (see lib/drought.ts and
 * `formlas and data/entroy_weight_method.png`): each factor map is normalised
 * by direction, scored by information entropy, and weighted by how much it
 * disperses. Nobody picks the weights by hand.
 *
 * The source paper uses NDVI, soil moisture, LST and PET. Every factor the
 * grid carries is scored, so each has a measurable impact on the result:
 * vegetation (NDVI) and vegetation water (NDWI), the standardised indices
 * (SPEI-3, SPI-3), soil moisture, mean temperature, and the raw 30-day
 * rainfall and ET₀. Rainfall and ET₀ overlap with SPEI/SPI, which are built
 * from them; the entropy method weights each by how much it actually varies
 * across the region, so a factor that adds little gets little weight.
 *
 * NDVI is now the real thing: Sentinel-2 L2A, cloud- and water-masked, from
 * the Copernicus Data Space Ecosystem (lib/copernicus.ts). It appears only
 * when CDSE credentials are configured — without them the factor is absent
 * and the weighting redistributes across the remaining four on its own.
 *
 * One substitution remains, and is labelled as such in the UI:
 *   • LST → 2 m mean air temperature (no thermal satellite feed wired up)
 */
import { entropyWeights, type Factor } from "@/lib/drought";

export interface GridCell {
  lat: number;
  lon: number;
  /** 30-day precipitation total, mm. */
  precip30: number | null;
  /** 30-day reference evapotranspiration total, mm. */
  et030: number | null;
  /** Mean daily air temperature over the window, °C. */
  tmean: number | null;
  /** Volumetric soil water content, 3–9 cm, m³/m³. */
  soilMoisture: number | null;
  /** Gridded SPEI-3 over the last three complete calendar months. */
  spei3?: number | null;
  /** Gridded SPI-3 over the same window. */
  spi3?: number | null;
  /** Sentinel-2 NDVI, cell mean over usable land pixels. Null without CDSE. */
  ndvi?: number | null;
  /** Sentinel-2 NDWI (NIR − SWIR), same masking. Null without CDSE. */
  ndwi?: number | null;
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
  { key: "ndvi", label: "Vegetation (NDVI)", direction: "positive" as const, note: "Sentinel-2 L2A" },
  { key: "ndwi", label: "Vegetation water (NDWI)", direction: "positive" as const, note: "Sentinel-2 L2A" },
  { key: "spei3", label: "SPEI-3", direction: "positive" as const, note: "30-yr fit per cell" },
  { key: "spi3", label: "SPI-3", direction: "positive" as const, note: "30-yr fit per cell" },
  { key: "soilMoisture", label: "Soil moisture", direction: "positive" as const },
  { key: "tmean", label: "Mean temperature", direction: "negative" as const, note: "stands in for LST" },
  { key: "precip30", label: "Rainfall (30 d)", direction: "positive" as const },
  { key: "et030", label: "Evapotranspiration", direction: "negative" as const },
];

export function scoreGrid(cells: GridCell[]): RiskSurface {
  // NDVI is only present when a Copernicus feed is configured. Including a
  // factor that is null everywhere would hand it a weight it has not earned,
  // so it is dropped unless some cell actually carries a value.
  // A factor that is null everywhere would take a weight it has not earned,
  // so it is dropped rather than carried at zero. NDVI needs Copernicus
  // credentials; the standardised indices need the fitted climatology.
  const OPTIONAL = new Set(["ndvi", "ndwi", "spei3", "spi3"]);
  const has = (key: string) =>
    cells.some((c) => (c[key as keyof GridCell] as number | null) != null);

  const present = FACTOR_META.filter((f) => !OPTIONAL.has(f.key) || has(f.key));

  const factors: Factor[] = present.map((f) => ({
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
    factors: present,
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
          tmean: c.tmean,
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
