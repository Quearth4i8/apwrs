import { NextResponse } from "next/server";
import { scoreGrid, toGeoJSON, type GridCell } from "@/lib/risk";

/**
 * The live risk surface: one Open-Meteo call for the whole grid, scored by
 * the entropy weight method, returned as GeoJSON the map can paint directly.
 *
 * Runs on the server so the upstream call is cached once for every viewer
 * rather than once per browser, and so the API surface stays swappable.
 */

export const revalidate = 1800; // the upstream model runs a few times a day

/** Bizerte governorate, covering both stations with room around them. */
export const REGION = { minLat: 36.85, maxLat: 37.42, minLon: 9.05, maxLon: 10.05 };
const ROWS = 12;
const COLS = 10;

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

export async function GET() {
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
  // Daily aggregates keep the response ~0.17 MB. The hourly soil variable
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
      soilMoisture: mean(p.daily?.soil_moisture_0_to_100cm_mean?.slice(-7)),
    }));

    const surface = scoreGrid(cells);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      source: "Open-Meteo · ERA5-derived forecast, FAO-56 ET₀",
      region: REGION,
      cell: CELL,
      weights: surface.weights,
      entropy: surface.entropy,
      factors: surface.factors,
      geojson: toGeoJSON(surface, CELL),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "risk surface unavailable", detail: String(err) },
      { status: 502 },
    );
  }
}
