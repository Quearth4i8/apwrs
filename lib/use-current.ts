"use client";

import * as React from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, Sun, type LucideIcon } from "lucide-react";
import type { CurrentWeather } from "@/app/api/current/route";

/**
 * Today's weather at a station (/api/current), shared by every card that
 * shows it: one request per station, kept for ten minutes, refreshed while
 * the page stays open.
 */

const TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; promise: Promise<CurrentWeather> }>();

function load(stationId: string, force = false): Promise<CurrentWeather> {
  const hit = cache.get(stationId);
  if (hit && !force && Date.now() - hit.at < TTL) return hit.promise;
  const promise = fetch(`/api/current?station=${encodeURIComponent(stationId)}`)
    .then((r) => (r.ok ? (r.json() as Promise<CurrentWeather>) : Promise.reject(new Error(`current ${r.status}`))))
    .catch((e) => {
      cache.delete(stationId);
      throw e;
    });
  cache.set(stationId, { at: Date.now(), promise });
  return promise;
}

export function useCurrentWeather(stationId: string) {
  const [state, setState] = React.useState<{ id: string; data: CurrentWeather | null; error: boolean }>({
    id: stationId,
    data: null,
    error: false,
  });

  React.useEffect(() => {
    let live = true;
    const run = (force: boolean) =>
      load(stationId, force)
        .then((data) => live && setState({ id: stationId, data, error: false }))
        .catch(() => live && setState((s) => ({ ...s, id: stationId, error: true })));
    run(false);
    const t = window.setInterval(() => run(true), TTL);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [stationId]);

  const fresh = state.id === stationId;
  return { data: fresh ? state.data : null, error: fresh && state.error };
}

/** A WMO weather code as words and an icon (Open-Meteo's code table). */
export function skyOf(code: number | null, isDay = true): { label: string; icon: LucideIcon; color: string } {
  if (code == null) return { label: "—", icon: Cloud, color: "#8a8f93" };
  if (code === 0) return isDay ? { label: "Clear sky", icon: Sun, color: "#E7A83B" } : { label: "Clear night", icon: Moon, color: "#7B8FD9" };
  if (code <= 2)
    return isDay
      ? { label: code === 1 ? "Mostly clear" : "Partly cloudy", icon: CloudSun, color: "#E7A83B" }
      : { label: code === 1 ? "Mostly clear" : "Partly cloudy", icon: CloudMoon, color: "#7B8FD9" };
  if (code === 3) return { label: "Overcast", icon: Cloud, color: "#8A94A6" };
  if (code === 45 || code === 48) return { label: "Fog", icon: CloudFog, color: "#8A94A6" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: CloudDrizzle, color: "#2BA6B8" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { label: code >= 80 ? "Rain showers" : code >= 65 ? "Heavy rain" : "Rain", icon: CloudRain, color: "#2F7FD1" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "Snow", icon: CloudSnow, color: "#7B8FD9" };
  if (code >= 95) return { label: "Thunderstorm", icon: CloudLightning, color: "#6E59C9" };
  return { label: "Cloudy", icon: Cloud, color: "#8A94A6" };
}
