import { NextResponse } from "next/server";
import { scoreGrid, type GridCell } from "@/lib/risk";

/**
 * The live risk surface: one Open-Meteo call for the whole grid, scored by
 * the entropy weight method, returned as flat row-major arrays that the
 * client resamples into a continuous image.
 *
 * Runs on the server so the upstream call is cached once for every viewer
 * rather than once per browser, and so the API surface stays swappable.
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
    temperature_2m_max?: (number | null)[];
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
    "&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max," +
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

    const cells: GridCell[] = points.map((p) => ({
      lat: p.latitude,
      lon: p.longitude,
      precip30: sum(p.daily?.precipitation_sum),
      et030: sum(p.daily?.et0_fao_evapotranspiration),
      tmax: mean(p.daily?.temperature_2m_max),
      soilMoisture: soilOrNull(mean(p.daily?.soil_moisture_0_to_100cm_mean?.slice(-7))),
    }));

    const surface = scoreGrid(cells);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      source: "Open-Meteo · ECMWF-derived, FAO-56 ET₀",
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
        tmax: surface.cells.map((c) => round(c.tmax, 1)),
        soilMoisture: surface.cells.map((c) => round(c.soilMoisture, 3)),
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
