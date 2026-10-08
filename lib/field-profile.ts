"use client";

import * as React from "react";
import type { Texture } from "@/lib/crop-calendar";

/**
 * A user's field: the soil and farming facts the planting advice is judged
 * against. Climate is not asked for: it comes from the selected station's
 * 30-year record (lib/advisor.ts). Each user keeps their own and can change it at any time
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

/**
 * A starting profile: soil typical of the lower Medjerda / Ichkeul plains —
 * calcareous loam, slightly alkaline — on fallow, rainfed land.
 */
export function defaultProfile(): FieldProfile {
  return {
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
 * The user's saved profile, or the defaults when they have none. `saved`
 * says which, so pages can invite the user to fill theirs in.
 */
export function useFieldProfile(user: string) {
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
    return { profile: saved ?? defaultProfile(), saved: saved != null };
  }, [raw]);
}
