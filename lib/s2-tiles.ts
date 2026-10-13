"use client";

import * as React from "react";
import { addProtocol } from "maplibre-gl";
import { LAYER, rampAt } from "@/lib/map-layers";
import { S2, S2_MAXZOOM, S2_MINZOOM, lonLatToTile, type S2Index } from "@/lib/s2";
import type { FieldIndices } from "@/lib/copernicus";

/**
 * The browser half of the Sentinel-2 tiles: a `s2://<index>/<clip>/{z}/{x}/{y}`
 * protocol for MapLibre that fetches the value-encoded tile from /api/s2,
 * decodes the index per pixel, clips it to a named outline (the catchment, or
 * one field), colours it on the layer's ramp, and keeps the values so the map
 * can read the index under the pointer.
 */

type Ring = number[][];

/** Decoded tiles, newest last; NaN where there is no value. */
const values = new Map<string, Float32Array>();
const KEEP = 600;

/** Outlines a tile can be clipped to, by name. */
const clips = new Map<string, Ring[]>();
let registered = false;

const lut = (index: S2Index) => {
  const ramp = LAYER[index].ramp;
  return Array.from({ length: 256 }, (_, i) => rampAt(ramp, i / 255));
};
const LUTS: Partial<Record<S2Index, ReturnType<typeof lut>>> = {};

/** Pixels inside `rings`, as a 256 × 256 alpha mask. */
function maskOf(rings: Ring[] | undefined, z: number, x: number, y: number): Uint8ClampedArray | null {
  if (!rings?.length) return null;
  const c = new OffscreenCanvas(256, 256);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.beginPath();
  for (const ring of rings) {
    ring.forEach(([lon, lat], i) => {
      const [tx, ty] = lonLatToTile(lon, lat, z);
      const px = (tx - x) * 256;
      const py = (ty - y) * 256;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  }
  ctx.fill("evenodd");
  return ctx.getImageData(0, 0, 256, 256).data;
}

async function load(url: string, signal: AbortSignal): Promise<ImageBitmap> {
  const [index, clip, zs, xs, ys] = url.replace("s2://", "").split("/");
  const [z, x, y] = [zs, xs, ys].map(Number);
  const res = await fetch(`/api/s2/${index}/${z}/${x}/${y}`, { signal });
  if (!res.ok) throw new Error(`s2 tile ${res.status}`);

  const bmp = await createImageBitmap(await res.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  const canvas = new OffscreenCanvas(256, 256);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, 256, 256);
  const img = ctx.getImageData(0, 0, 256, 256);
  const px = img.data;
  const mask = maskOf(clips.get(clip), z, x, y);

  const key = index as S2Index;
  const colours = (LUTS[key] ??= lut(key));
  const [lo, hi] = S2[key].domain;
  const v = new Float32Array(256 * 256);
  for (let i = 0; i < v.length; i++) {
    const o = i * 4;
    if (px[o + 3] < 128 || (mask && mask[o + 3] < 128)) {
      v[i] = NaN;
      px[o + 3] = 0;
      continue;
    }
    const value = ((px[o] * 256 + px[o + 1]) / 65535) * 2 - 1;
    v[i] = value;
    const [r, g, b] = colours[Math.round(Math.min(1, Math.max(0, (value - lo) / (hi - lo))) * 255)];
    px[o] = r;
    px[o + 1] = g;
    px[o + 2] = b;
    px[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const k = `${index}/${clip}/${z}/${x}/${y}`;
  values.delete(k);
  values.set(k, v);
  if (values.size > KEEP) values.delete(values.keys().next().value!);

  return createImageBitmap(canvas);
}

/** Names an outline tiles can be clipped to, and registers the protocol once. */
export function setS2Clip(name: string, rings: Ring[]) {
  clips.set(name, rings);
  if (registered) return;
  registered = true;
  addProtocol("s2", async (params, abort) => ({ data: await load(params.url, abort.signal) }));
}

export const s2TileUrl = (index: S2Index, clip: string) => `s2://${index}/${clip}/{z}/{x}/{y}`;

/**
 * The index at a point, from the finest tile already loaded that covers it,
 * or null if none is (or the pixel is cloud, water or clipped away).
 */
export function s2ValueAt(index: S2Index, clip: string, lon: number, lat: number, zoom: number): number | null {
  const top = Math.min(S2_MAXZOOM, Math.ceil(zoom) + 1);
  for (let z = top; z >= S2_MINZOOM; z--) {
    const [tx, ty] = lonLatToTile(lon, lat, z);
    const v = values.get(`${index}/${clip}/${z}/${Math.floor(tx)}/${Math.floor(ty)}`);
    if (!v) continue;
    const px = Math.min(255, Math.floor((tx % 1) * 256));
    const py = Math.min(255, Math.floor((ty % 1) * 256));
    const value = v[py * 256 + px];
    return Number.isNaN(value) ? null : value;
  }
  return null;
}

/* ── One field's own figures ─────────────────────────────────────────── */

const fieldCache = new Map<string, Promise<FieldIndices | null>>();

/**
 * NDVI and NDWI over a field's own pixels (app/api/lands/[id]/indices). Keyed
 * on the field's last edit, so a redrawn outline is fetched afresh.
 */
export function useFieldIndices(land: { id: string; updatedAt: string } | null) {
  const [state, setState] = React.useState<{ key: string; data: FieldIndices | null; error: boolean } | null>(null);
  const key = land ? `${land.id}@${land.updatedAt}` : null;

  React.useEffect(() => {
    if (!key || !land) return;
    let live = true;
    let p = fieldCache.get(key);
    if (!p) {
      p = fetch(`/api/lands/${land.id}/indices`).then((r) => (r.ok ? r.json() : null));
      fieldCache.set(key, p);
      p.catch(() => fieldCache.delete(key));
    }
    p.then(
      (data) => live && setState({ key, data, error: data == null }),
      () => live && setState({ key, data: null, error: true }),
    );
    return () => {
      live = false;
    };
    // land is read only for its id, which the key already carries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state && state.key === key ? state : null;
  return { data: current?.data ?? null, loading: key != null && !current, error: current?.error ?? false };
}
