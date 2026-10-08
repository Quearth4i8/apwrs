import { NextResponse } from "next/server";
import { scoreGrid, type GridCell } from "@/lib/risk";
import { fetchNdviGrid, fetchNdwiGrid } from "@/lib/copernicus";
import { fetchGridIndices, CLIMATOLOGY_SOURCE } from "@/lib/grid-indices";

/**
 * The live risk surface: one Open-Meteo call for the whole grid plus, when
 * Copernicus credentials are configured, one Sentinel-2 NDVI raster. Scored
 * by the entropy weight method and returned as flat row-major arrays that the
 * client resamples into a continuous image.
 *
 * Runs on the server so the upstream calls are cached once for every viewer
 * rather than once per browser, so the credentials never reach the client,
 * and so the API surface stays swappable.
 */

export const revalidate = 1800; // the upstream model runs a few times a day

/** Bizerte governorate, covering both stations with room around them. */
export const REGION = { minLat: 36.85, maxLat: 37.42, minLon: 9.05, maxLon: 10.05 };

/**
 * 20 x 16 is the most the upstream API takes in one URL — 572 points returns
 * 414. The source model resolves at roughly 9 km, so this oversamples it;
 * the extra points buy a smoother interpolation, not more information, and
 * the response advertises the model resolution rather than the sampling.
 */
const ROWS = 20;
const COLS = 16;
const MODEL_RESOLUTION_KM = 9;

const CELL = {
  lat: (REGION.maxLat - REGION.minLat) / (ROWS - 1),
  lon: (REGION.maxLon - REGION.minLon) / (COLS - 1),
};

interface OpenMeteoPoint {
  latitude: number;
  longitude: number;
  daily?: {
    precipitation_sum?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
    temperature_2m_mean?: (number | null)[];
    soil_moisture_0_to_100cm_mean?: (number | null)[];
  };
}

const sum = (a?: (number | null)[]) =>
  a?.length ? a.reduce((s: number, v) => s + (v ?? 0), 0) : null;

const mean = (a?: (number | null)[]) => {
  const v = a?.filter((x): x is number => x != null) ?? [];
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

const round = (v: number | null, d: number) =>
  v == null ? null : +v.toFixed(d);

/**
 * Soil moisture is a land variable. Over water the model returns 0, which is
 * not "bone dry" but "no soil here" — taking it literally made the sea the
 * driest thing on the map, stretched the factor's range and so distorted its
 * entropy weight for every land cell too. Treat it as missing instead, which
 * also serves as the land mask.
 */
const soilOrNull = (v: number | null) => (v != null && v > 0 ? v : null);

export async function GET() {
  // Row 0 is the southern edge, matching the raster's orientation.
  const lats: number[] = [];
  const lons: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      lats.push(+(REGION.minLat + r * CELL.lat).toFixed(4));
      lons.push(+(REGION.minLon + c * CELL.lon).toFixed(4));
    }
  }

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lats.join(",")}&longitude=${lons.join(",")}` +
    "&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_mean," +
    "soil_moisture_0_to_100cm_mean" +
    "&past_days=30&forecast_days=1&timezone=UTC";
  // Daily aggregates keep the response near 0.5 MB. The hourly soil variable
  // pushed it past Next's 2 MB data-cache ceiling, which silently disabled
  // caching and sent every visitor upstream.

  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const body = (await res.json()) as OpenMeteoPoint[] | OpenMeteoPoint;
    const points = Array.isArray(body) ? body : [body];

    // Sentinel-2 is optional: without credentials, or if CDSE is having a bad
    // day, the surface still scores on the weather factors alone rather than
    // failing the whole request.
    let ndvi: Awaited<ReturnType<typeof fetchNdviGrid>> = null;
    let ndviError: string | null = null;
    let indices: Awaited<ReturnType<typeof fetchGridIndices>> | null = null;
    let indicesError: string | null = null;

    // All three are optional and independent, so they run together and none can
    // fail the request on its own.
    const [ndviSettled, indicesSettled, ndwiSettled] = await Promise.allSettled([
      fetchNdviGrid(REGION, ROWS, COLS),
      fetchGridIndices(lats, lons, revalidate),
      fetchNdwiGrid(REGION, ROWS, COLS),
    ]);
    const ndwi = ndwiSettled.status === "fulfilled" ? ndwiSettled.value : null;
    if (ndviSettled.status === "fulfilled") ndvi = ndviSettled.value;
    else ndviError = String(ndviSettled.reason?.message ?? ndviSettled.reason);
    if (indicesSettled.status === "fulfilled") indices = indicesSettled.value;
    else indicesError = String(indicesSettled.reason?.message ?? indicesSettled.reason);

    const cells: GridCell[] = points.map((p, i) => ({
      lat: p.latitude,
      lon: p.longitude,
      precip30: sum(p.daily?.precipitation_sum),
      et030: sum(p.daily?.et0_fao_evapotranspiration),
      tmean: mean(p.daily?.temperature_2m_mean),
      soilMoisture: soilOrNull(mean(p.daily?.soil_moisture_0_to_100cm_mean?.slice(-7))),
      ndvi: ndvi?.values[i] ?? null,
      ndwi: ndwi?.values[i] ?? null,
      spei3: indices?.spei3[i] ?? null,
      spi3: indices?.spi3[i] ?? null,
    }));

    const surface = scoreGrid(cells);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      source: ndvi
        ? `Open-Meteo · ECMWF-derived, FAO-56 ET₀ — with ${ndvi.source}`
        : "Open-Meteo · ECMWF-derived, FAO-56 ET₀",
      ndvi: ndvi
        ? { coverage: ndvi.coverage, source: ndvi.source }
        : { coverage: 0, source: null, error: ndviError },
      indices: indices
        ? {
            coverage: indices.coverage,
            window: indices.window,
            source: CLIMATOLOGY_SOURCE,
          }
        : { coverage: 0, window: null, source: null, error: indicesError },
      resolutionKm: MODEL_RESOLUTION_KM,
      samplingKm: {
        lat: +(CELL.lat * 111).toFixed(1),
        lon: +(CELL.lon * 111 * Math.cos((37.1 * Math.PI) / 180)).toFixed(1),
      },
      region: REGION,
      grid: {
        rows: ROWS,
        cols: COLS,
        risk: surface.cells.map((c) => c.risk),
        precip30: surface.cells.map((c) => round(c.precip30, 1)),
        et030: surface.cells.map((c) => round(c.et030, 1)),
        tmean: surface.cells.map((c) => round(c.tmean, 1)),
        soilMoisture: surface.cells.map((c) => round(c.soilMoisture, 3)),
        ndvi: surface.cells.map((c) => round(c.ndvi ?? null, 3)),
        spei3: surface.cells.map((c) => round(c.spei3 ?? null, 2)),
        spi3: surface.cells.map((c) => round(c.spi3 ?? null, 2)),
        ndwi: surface.cells.map((c) => round(c.ndwi ?? null, 3)),
      },
      weights: surface.weights,
      entropy: surface.entropy,
      factors: surface.factors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "risk surface unavailable", detail: String(err) },
      { status: 502 },
    );
  }
}
