"use client";

import * as React from "react";
import type { Station } from "@/lib/climate";
import type { Texture } from "@/lib/crop-calendar";

/**
 * A user's field: the climate, soil and farming facts the planting advice is
 * judged against. Each user keeps their own and can change it at any time
 * on the Field Profile page.
 *
 * There is no account backend yet, so a profile lives in the browser under a
 * per-user key. Everything goes through `readProfile` / `saveProfile`, so
 * moving it to a server later touches only this file.
 */

export type Drainage = "poor" | "moderate" | "good";
export type Irrigation = "rainfed" | "drip" | "sprinkler" | "surface";
export type GrowthStage = "fallow" | "preparation" | "sown" | "vegetative" | "flowering" | "maturity";

export interface FieldProfile {
  climate: {
    /** Annual rain, mm. */
    precipitation: number;
    /** Annual mean daily solar radiation, MJ/m²/day. */
    solarRadiation: number;
    /** Annual mean wind speed at 2 m, m/s. */
    windSpeed: number;
    /** Annual mean relative humidity, %. */
    relativeHumidity: number;
    /** Annual mean air temperature, °C. */
    meanTemperature: number;
  };
  soil: {
    texture: Texture;
    ph: number;
    /** Electrical conductivity of the saturation extract, dS/m. */
    salinity: number;
    /** Organic matter, %. */
    organicMatter: number;
    /** Rooting depth, cm. */
    depth: number;
    drainage: Drainage;
  };
  agriculture: {
    /** The crop on the field now or last season; "none" for new or fallow land. */
    cropType: string;
    growthStage: GrowthStage;
    irrigation: Irrigation;
  };
  /** ISO time of the last save; absent on defaults the user has not saved. */
  savedAt?: string;
}

export const TEXTURES: { value: Texture; label: string }[] = [
  { value: "sand", label: "Sandy" },
  { value: "sandy-loam", label: "Sandy loam" },
  { value: "loam", label: "Loam" },
  { value: "clay-loam", label: "Clay loam" },
  { value: "clay", label: "Clay" },
];

export const DRAINAGE: { value: Drainage; label: string }[] = [
  { value: "poor", label: "Poor" },
  { value: "moderate", label: "Moderate" },
  { value: "good", label: "Good" },
];

export const IRRIGATION: { value: Irrigation; label: string }[] = [
  { value: "rainfed", label: "Rainfed" },
  { value: "drip", label: "Drip" },
  { value: "sprinkler", label: "Sprinkler" },
  { value: "surface", label: "Surface / furrow" },
];

export const GROWTH_STAGES: { value: GrowthStage; label: string }[] = [
  { value: "fallow", label: "Fallow / harvested" },
  { value: "preparation", label: "Land preparation" },
  { value: "sown", label: "Sown / emerging" },
  { value: "vegetative", label: "Vegetative" },
  { value: "flowering", label: "Flowering" },
  { value: "maturity", label: "Maturity" },
];

/** The station's 30-year averages, as the climate half of a profile. */
export function climateFromStation(s: Station): FieldProfile["climate"] {
  const n = s.normals;
  const avg = (f: (x: (typeof n)[number]) => number) => n.reduce((a, x) => a + f(x), 0) / n.length;
  return {
    precipitation: Math.round(n.reduce((a, x) => a + x.precip, 0)),
    solarRadiation: +avg((x) => x.rs).toFixed(1),
    windSpeed: +avg((x) => x.wind).toFixed(1),
    relativeHumidity: Math.round(avg((x) => x.rh)),
    meanTemperature: +avg((x) => x.tmean).toFixed(1),
  };
}

/**
 * A starting profile: the station's climate, and soil typical of the lower
 * Medjerda / Ichkeul plains — calcareous loam, slightly alkaline.
 */
export function defaultProfile(s: Station): FieldProfile {
  return {
    climate: climateFromStation(s),
    soil: { texture: "loam", ph: 7.8, salinity: 2, organicMatter: 1.5, depth: 80, drainage: "moderate" },
    agriculture: { cropType: "none", growthStage: "fallow", irrigation: "rainfed" },
  };
}

/* ── Storage ─────────────────────────────────────────────────────────── */

/** Whose profile the console reads. One per signed-in user once accounts exist. */
export const PROFILE_USER = "expert";

const KEY = (user: string) => `apwrs:field-profile:${user}`;
const EVENT = "apwrs:field-profile";

export function readProfile(user: string): FieldProfile | null {
  try {
    const raw = localStorage.getItem(KEY(user));
    return raw ? (JSON.parse(raw) as FieldProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(user: string, p: FieldProfile): FieldProfile {
  const saved = { ...p, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY(user), JSON.stringify(saved));
  } catch {
    /* storage blocked: the profile still applies for this visit */
  }
  window.dispatchEvent(new Event(EVENT));
  return saved;
}

export function clearProfile(user: string) {
  try {
    localStorage.removeItem(KEY(user));
  } catch {
    /* nothing stored */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * The user's saved profile, or the station defaults when they have none.
 * `saved` says which, so pages can invite the user to fill theirs in.
 */
export function useFieldProfile(user: string, station: Station) {
  const raw = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(KEY(user));
      } catch {
        return null;
      }
    },
    () => null,
  );
  return React.useMemo(() => {
    let saved: FieldProfile | null = null;
    try {
      saved = raw ? (JSON.parse(raw) as FieldProfile) : null;
    } catch {
      saved = null;
    }
    return { profile: saved ?? defaultProfile(station), saved: saved != null };
  }, [raw, station]);
}
