import { NextResponse } from "next/server";
import { STATIONS } from "@/lib/climate";

/**
 * Conditions right now at a station: sky, temperature, humidity, wind,
 * pressure, visibility, plus today's high, low and chance of rain,
 * from Open-Meteo's current-weather block (15-minute model steps), with
 * today's hourly values for the small trend lines. Times are local
 * (Africa/Tunis).
 */

export const revalidate = 600; // ten minutes; the model updates every fifteen

export interface CurrentWeather {
  station: { id: string; name: string };
  /** Local time of the reading, "YYYY-MM-DDTHH:mm". */
  time: string;
  humidity: number | null;
  /** km/h at 10 m. */
  wind: number | null;
  gusts: number | null;
  /** Degrees the wind comes from. */
  windDir: number | null;
  /** Sea-level pressure, hPa. */
  pressure: number | null;
  /** Metres. */
  visibility: number | null;
  temperature: number | null;
  /** WMO weather code for right now (0 clear … 99 thunderstorm with hail). */
  weatherCode: number | null;
  isDay: boolean;
  /** Today as a whole, local day. */
  today: {
    tmax: number | null;
    tmin: number | null;
    weatherCode: number | null;
    /** Highest chance of rain in any hour today, %. */
    rainChance: number | null;
  };
  hourly: {
    time: string[];
    humidity: (number | null)[];
    wind: (number | null)[];
    pressure: (number | null)[];
    visibility: (number | null)[];
  };
}

interface OpenMeteoCurrent {
  current?: Record<string, number | string | null>;
  hourly?: Record<string, (number | string | null)[]>;
  daily?: Record<string, (number | string | null)[]>;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("station") ?? STATIONS[0].id;
  const station = STATIONS.find((s) => s.id === id) ?? STATIONS[0];

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${station.lat}&longitude=${station.lon}` +
    "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,visibility,weather_code,is_day" +
    "&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max" +
    "&hourly=relative_humidity_2m,wind_speed_10m,pressure_msl,visibility" +
    "&forecast_days=1&wind_speed_unit=kmh&timezone=Africa%2FTunis";

  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const body = (await res.json()) as OpenMeteoCurrent;
    const c = body.current ?? {};
    const h = body.hourly ?? {};
    const d = body.daily ?? {};
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const nums = (a: unknown) => (Array.isArray(a) ? a.map(num) : []);

    const out: CurrentWeather = {
      station: { id: station.id, name: station.name },
      time: String(c.time ?? ""),
      humidity: num(c.relative_humidity_2m),
      wind: num(c.wind_speed_10m),
      gusts: num(c.wind_gusts_10m),
      windDir: num(c.wind_direction_10m),
      pressure: num(c.pressure_msl),
      visibility: num(c.visibility),
      temperature: num(c.temperature_2m),
      weatherCode: num(c.weather_code),
      isDay: c.is_day !== 0,
      today: {
        tmax: num(d.temperature_2m_max?.[0]),
        tmin: num(d.temperature_2m_min?.[0]),
        weatherCode: num(d.weather_code?.[0]),
        rainChance: num(d.precipitation_probability_max?.[0]),
      },
      hourly: {
        time: (h.time ?? []).map(String),
        humidity: nums(h.relative_humidity_2m),
        wind: nums(h.wind_speed_10m),
        pressure: nums(h.pressure_msl),
        visibility: nums(h.visibility),
      },
    };
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json({ error: "current weather unavailable", detail: String(err) }, { status: 502 });
  }
}
