"use client";

import * as React from "react";
import type { SoilProbe } from "@/lib/smartfarm";

export interface SoilPayload {
  generatedAt: string;
  source: string;
  days: number;
  probe: SoilProbe;
}

let cache: Promise<SoilPayload> | null = null;

function load() {
  cache ??= fetch("/api/soil").then(async (r) => {
    const body = await r.json().catch(() => null);
    if (!r.ok) {
      cache = null;
      throw new Error(body?.error ?? `soil ${r.status}`);
    }
    return body as SoilPayload;
  });
  return cache;
}

/** The SmartFarm soil probe; null while loading, error string on failure. */
export function useSoil() {
  const [state, setState] = React.useState<{ data: SoilPayload | null; error: string | null }>({
    data: null,
    error: null,
  });

  React.useEffect(() => {
    let live = true;
    load()
      .then((data) => live && setState({ data, error: null }))
      .catch((e) => live && setState({ data: null, error: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, []);

  return state;
}
