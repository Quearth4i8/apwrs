import { NextResponse } from "next/server";
import { STATIONS } from "@/lib/climate";

/**
 * Daily forecast and recent past for one station, straight from Open-Meteo.
 *
 * Only variables the upstream actually returns are passed through. Anything
 * the app would like but cannot get — NDVI, land surface temperature,
 * ensemble spread — is simply absent.
 */

export const revalidate = 1800;

export interface ForecastDay {
  date: string;
  precip: number | null;
  et0: number | null;
  tmax: number | null;
  tmin: number | null;
  soilMoisture: number | null;
  /** True for days at or after today. */
  forecast: boolean;
}

interface OpenMeteoResponse {
  daily?: {
    time?: string[];
    precipitation_sum?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    soil_moisture_0_to_100cm_mean?: (number | null)[];
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("station") ?? STATIONS[0].id;
  const station = STATIONS.find((s) => s.id === id) ?? STATIONS[0];

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${station.lat}&longitude=${station.lon}` +
    "&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min," +
    "soil_moisture_0_to_100cm_mean" +
    "&past_days=60&forecast_days=16&timezone=UTC";

  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const body = (await res.json()) as OpenMeteoResponse;

    const times = body.daily?.time ?? [];
    const today = new Date().toISOString().slice(0, 10);

    const days: ForecastDay[] = times.map((date, i) => ({
      date,
      precip: body.daily?.precipitation_sum?.[i] ?? null,
      et0: body.daily?.et0_fao_evapotranspiration?.[i] ?? null,
      tmax: body.daily?.temperature_2m_max?.[i] ?? null,
      tmin: body.daily?.temperature_2m_min?.[i] ?? null,
      soilMoisture: body.daily?.soil_moisture_0_to_100cm_mean?.[i] ?? null,
      forecast: date >= today,
    }));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      source: "Open-Meteo · ECMWF-derived, FAO-56 ET₀",
      station: { id: station.id, name: station.name, lat: station.lat, lon: station.lon },
      horizonDays: days.filter((d) => d.forecast).length,
      days,
    });
  } catch (err) {
    return NextResponse.json({ error: "forecast unavailable", detail: String(err) }, { status: 502 });
  }
}
