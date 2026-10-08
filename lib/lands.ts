"use client";

import * as React from "react";

/**
 * Farmers' fields: each one a polygon a farmer drew on the map by marking
 * its corners. They are shared — the farmer draws and edits their own, the
 * expert sees everyone's on the Drought risk map — so they live on the server
 * (app/api/lands), not in the browser.
 *
 * There are no accounts yet, so a farmer is a random id kept in their
 * browser plus the name they type; each field carries both.
 */

import type { Land, LandDraft } from "@/lib/land-geometry";

export * from "@/lib/land-geometry";

/* ── Farmer identity ─────────────────────────────────────────────────── */

const ME = "apwrs:farmer";
const ME_EVENT = "apwrs:farmer";

export interface Farmer {
  id: string;
  name: string;
}

function readMe(): string | null {
  try {
    return localStorage.getItem(ME);
  } catch {
    return null;
  }
}

/** This browser's farmer: a stable id, and the name they gave, if any. */
export function useFarmer() {
  const raw = React.useSyncExternalStore(
    (cb) => {
      window.addEventListener(ME_EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(ME_EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    readMe,
    () => null,
  );
  const farmer = React.useMemo<Farmer | null>(() => {
    try {
      return raw ? (JSON.parse(raw) as Farmer) : null;
    } catch {
      return null;
    }
  }, [raw]);

  const setName = React.useCallback(
    (name: string) => {
      const next: Farmer = { id: farmer?.id ?? crypto.randomUUID(), name: name.trim() };
      try {
        localStorage.setItem(ME, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      window.dispatchEvent(new Event(ME_EVENT));
    },
    [farmer?.id],
  );
  return { farmer, setName };
}

/* ── Server calls ────────────────────────────────────────────────────── */

const LANDS_EVENT = "apwrs:lands";

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error((await r.text()) || `lands ${r.status}`);
  return r.json() as Promise<T>;
}

export async function saveLand(owner: Farmer, draft: LandDraft): Promise<Land> {
  const land = await json<Land>(
    await fetch("/api/lands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, ownerId: owner.id, ownerName: owner.name }),
    }),
  );
  window.dispatchEvent(new Event(LANDS_EVENT));
  return land;
}

export async function deleteLand(owner: Farmer, id: string) {
  await json(await fetch(`/api/lands?id=${encodeURIComponent(id)}&owner=${encodeURIComponent(owner.id)}`, { method: "DELETE" }));
  window.dispatchEvent(new Event(LANDS_EVENT));
}

/** Every field, or one farmer's; refetched whenever a field is saved or deleted. */
export function useLands(ownerId?: string | null) {
  const [state, setState] = React.useState<{ lands: Land[] | null; error: string | null }>({ lands: null, error: null });
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(LANDS_EVENT, bump);
    return () => window.removeEventListener(LANDS_EVENT, bump);
  }, []);

  React.useEffect(() => {
    if (ownerId === null) return;
    let live = true;
    fetch(ownerId ? `/api/lands?owner=${encodeURIComponent(ownerId)}` : "/api/lands", { cache: "no-store" })
      .then((r) => json<Land[]>(r))
      .then((lands) => live && setState({ lands, error: null }))
      .catch((e) => live && setState({ lands: null, error: String(e) }));
    return () => {
      live = false;
    };
  }, [ownerId, tick]);

  return state;
}
