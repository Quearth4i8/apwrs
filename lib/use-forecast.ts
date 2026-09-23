"use client";

import * as React from "react";
import type { ForecastDay } from "@/app/api/forecast/route";

export interface ForecastPayload {
  generatedAt: string;
  source: string;
  station: { id: string; name: string; lat: number; lon: number };
  horizonDays: number;
  days: ForecastDay[];
}

const cache = new Map<string, Promise<ForecastPayload>>();

function load(stationId: string) {
  let p = cache.get(stationId);
  if (!p) {
    p = fetch(`/api/forecast?station=${encodeURIComponent(stationId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`forecast ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        cache.delete(stationId);
        throw e;
      });
    cache.set(stationId, p);
  }
  return p;
}

/**
 * Live daily forecast for a station; null while loading, error string on
 * failure. The result carries the station it belongs to, so switching
 * stations reads as "loading" without an effect resetting state first.
 */
export function useForecast(stationId: string) {
  const [state, setState] = React.useState<{
    id: string;
    data: ForecastPayload | null;
    error: string | null;
  }>({ id: stationId, data: null, error: null });

  React.useEffect(() => {
    let live = true;
    load(stationId)
      .then((data) => live && setState({ id: stationId, data, error: null }))
      .catch((e) => live && setState({ id: stationId, data: null, error: String(e) }));
    return () => {
      live = false;
    };
  }, [stationId]);

  const fresh = state.id === stationId;
  return { data: fresh ? state.data : null, error: fresh ? state.error : null };
}
