"use client";

import * as React from "react";
import Map, { Layer, Marker, NavigationControl, Popup, ScaleControl, Source, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { STATIONS } from "@/lib/climate";
import { nearestCell, renderFieldImage, renderRiskImage } from "@/lib/raster";
import { LAYER, domainOf, rampAt, type LayerKey } from "@/lib/map-layers";

/**
 * MapLibre v6 resolves its worker from `import.meta.url`, which bundlers
 * cannot trace — under Turbopack that URL points nowhere and every tile
 * fails to decode ("Worker failed to load"). scripts/sync-maplibre-worker.mjs
 * copies the worker into public/, and this points the library at it. Must
 * run before the first Map is constructed.
 */
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}

/**
 * The real map: MapLibre GL over ESRI satellite imagery, on every map in the
 * app. The drought layer is a continuous field resampled from /api/grid and
 * slotted *beneath* a water fill, so the sea and the lakes mask it, and
 * beneath the place labels so they stay legible on top.
 */

export const DEFAULT_VIEW = { longitude: 9.55, latitude: 37.13, zoom: 8.6 };

/** west, south, east, north — react-map-gl takes the flat form. */
export const MAX_BOUNDS: [number, number, number, number] = [8.4, 36.3, 10.8, 37.9];

export interface MapCell {
  id: string;
  score: number;
  /** Where the user clicked, to 3 decimals; the values are the grid cell's around it. */
  lat: string;
  lon: string;
  /** The clicked point, [longitude, latitude]. */
  at: [number, number];
  precip30: number | null;
  et030: number | null;
  tmax: number | null;
  soilMoisture: number | null;
}

export interface GridPayload {
  generatedAt: string;
  source: string;
  resolutionKm: number;
  samplingKm: { lat: number; lon: number };
  region: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  grid: {
    rows: number;
    cols: number;
    risk: (number | null)[];
    precip30: (number | null)[];
    et030: (number | null)[];
    tmax: (number | null)[];
    soilMoisture: (number | null)[];
    ndvi?: (number | null)[];
    spei3?: (number | null)[];
    spi3?: (number | null)[];
    ndwi?: (number | null)[];
  };
  weights: Record<string, number>;
  entropy: Record<string, number>;
  factors: { key: string; label: string; direction: "positive" | "negative"; note?: string }[];
  ndvi?: { coverage: number; source: string | null; error?: string | null };
  indices?: {
    coverage: number;
    window: { from: string; to: string; month: number; year: number } | null;
    source: string | null;
    error?: string | null;
  };
}

export type SurfaceInfo = Omit<GridPayload, "grid" | "region">;

export interface MapViewProps {
  layer?: LayerKey | "none";
  sensors?: boolean;
  legend?: boolean;
  opacity?: number;
  /** Mark this point, [longitude, latitude] — the spot the user clicked. */
  selectedAt?: [number, number] | null;
  onCell?: (cell: MapCell) => void;
  interactive?: boolean;
  className?: string;
  onSurface?: (info: SurfaceInfo) => void;
  /** Extra sources, layers and markers drawn on this map (e.g. farmers' fields). */
  children?: React.ReactNode;
  /** Fly the camera to these bounds [west, south, east, north] whenever they change. */
  focus?: [number, number, number, number] | null;
}

/** One fetch per page, shared by every map on it. */
let gridPromise: Promise<GridPayload> | null = null;
export function loadGrid(): Promise<GridPayload> {
  gridPromise ??= fetch("/api/grid")
    .then((r) => {
      if (!r.ok) throw new Error(`grid ${r.status}`);
      return r.json();
    })
    .catch((e) => {
      gridPromise = null;
      throw e;
    });
  return gridPromise;
}

/**
 * The two rotation paths MapLibre leaves on after `dragRotate={false}`:
 * pinch-twist on touch, and shift+arrow on the keyboard. Both are turned off
 * without disabling their handlers wholesale, so pinch-zoom and keyboard
 * panning still work. Bearing and pitch are reset in case a style or a saved
 * view brought a tilted camera with it.
 */
export function lockToPlan(e: { target: MapLibreMap }) {
  const map = e.target;
  map.touchZoomRotate?.disableRotation();
  map.keyboard?.disableRotation();
  if (map.getBearing() !== 0) map.setBearing(0);
  if (map.getPitch() !== 0) map.setPitch(0);
}

export function MapView({
  layer = "risk",
  sensors = false,
  legend = false,
  opacity = 0.65,
  selectedAt = null,
  onCell,
  interactive = true,
  className,
  onSurface,
  children,
  focus = null,
}: MapViewProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<MapRef | null>(null);

  React.useEffect(() => {
    if (!focus) return;
    mapRef.current?.fitBounds(focus, { padding: 90, maxZoom: 16.5, duration: 1300 });
  }, [focus]);

  const [payload, setPayload] = React.useState<GridPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<{ lng: number; lat: number; value: number } | null>(null);

  React.useEffect(() => {
    if (layer === "none") return;
    let live = true;
    loadGrid()
      .then((d) => {
        if (!live) return;
        setPayload(d);
        onSurface?.({
          generatedAt: d.generatedAt,
          source: d.source,
          resolutionKm: d.resolutionKm,
          samplingKm: d.samplingKm,
          weights: d.weights,
          entropy: d.entropy,
          factors: d.factors,
          ndvi: d.ndvi,
        });
      })
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [layer, onSurface]);

  /**
   * The image is a pure function of the grid, so it is derived rather than
   * stored — no effect, no extra render. It needs a canvas, so it only ever
   * computes on the client, which is also the only place payload is set.
   */
  const field = React.useMemo(() => {
    if (!payload || layer === "none" || layer === "risk") return null;
    // Water cells carry no risk; mask every other layer the same way so the
    // weather fields do not spill out over the sea and the lakes.
    const raw = (payload.grid[layer] ?? []) as (number | null)[];
    const values = raw.map((v, i) => (payload.grid.risk[i] == null ? null : v));
    return { values, domain: domainOf(LAYER[layer], values) };
  }, [payload, layer]);

  const imageUrl = React.useMemo(() => {
    if (!payload || layer === "none" || typeof window === "undefined") return null;
    if (layer === "risk") return renderRiskImage(payload.grid).toDataURL("image/png");
    if (!field?.domain) return null;
    const [lo, hi] = field.domain;
    const ramp = LAYER[layer].ramp;
    return renderFieldImage(payload.grid.rows, payload.grid.cols, field.values, (v) => rampAt(ramp, (v - lo) / (hi - lo)))
      .toDataURL("image/png");
  }, [payload, layer, field]);
  const noData = payload != null && layer !== "none" && layer !== "risk" && !field?.domain;

  /** The raster is draped on the region's bounding box, north-west first. */
  const imageCoordinates = React.useMemo(() => {
    if (!payload) return null;
    const { minLat, maxLat, minLon, maxLon } = payload.region;
    return [
      [minLon, maxLat],
      [maxLon, maxLat],
      [maxLon, minLat],
      [minLon, minLat],
    ] as [[number, number], [number, number], [number, number], [number, number]];
  }, [payload]);

  const readCell = React.useCallback(
    (lat: number, lon: number): MapCell | null => {
      if (!payload) return null;
      const i = nearestCell(payload.grid, payload.region, lat, lon);
      if (i == null) return null;
      const risk = payload.grid.risk[i];
      if (risk == null) return null;
      // Report the point clicked, not the grid sample's centre: that can sit
      // several kilometres away, and the marker would land in the wrong place.
      return {
        id: String(i),
        score: risk,
        lat: lat.toFixed(3),
        lon: lon.toFixed(3),
        at: [lon, lat],
        precip30: payload.grid.precip30[i],
        et030: payload.grid.et030[i],
        tmax: payload.grid.tmax[i],
        soilMoisture: payload.grid.soilMoisture[i],
      };
    },
    [payload],
  );

  const showSurface = layer !== "none" && imageUrl && imageCoordinates;

  return (
    <div ref={hostRef} className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <Map
        ref={mapRef}
        mapStyle={SATELLITE_STYLE}
        initialViewState={DEFAULT_VIEW}
        maxBounds={MAX_BOUNDS}
        minZoom={6}
        maxZoom={18}
        interactive={interactive}
        attributionControl={{ compact: true }}
        cursor={onCell ? "crosshair" : "grab"}
        /* This is a flat data map. Tilting it distorts the risk surface and
           rotating it breaks the north-up reading of the coastline, so every
           path to a 3D view is closed: right-click and ctrl-drag (dragRotate),
           two-finger drag (touchPitch), pinch-twist and shift+arrows are all
           handled below or here, and maxPitch pins the camera flat. */
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        maxPitch={0}
        onLoad={lockToPlan}
        onMouseMove={(e) => {
          if (!payload || layer === "none") return;
          const cell = readCell(e.lngLat.lat, e.lngLat.lng);
          const value = !cell ? null : layer === "risk" ? cell.score : (field?.values[Number(cell.id)] ?? null);
          setHover(value != null ? { lng: e.lngLat.lng, lat: e.lngLat.lat, value } : null);
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          if (!onCell) return;
          const cell = readCell(e.lngLat.lat, e.lngLat.lng);
          if (cell) onCell(cell);
        }}
        onError={(e) => setMapError(e.error?.message ?? "map failed to load")}
        style={{ width: "100%", height: "100%" }}
      >
        {showSurface && (
          <Source id="risk" type="image" url={imageUrl} coordinates={imageCoordinates}>
            <Layer
              id="risk-raster"
              type="raster"
              beforeId={SATELLITE_WATER}
              paint={{
                "raster-opacity": opacity,
                "raster-resampling": "linear",
                "raster-fade-duration": 300,
              }}
            />
          </Source>
        )}

        {sensors &&
          STATIONS.map((s) => (
            <Marker key={s.id} longitude={s.lon} latitude={s.lat} anchor="center">
              <span
                title={`${s.id} · ${s.name}`}
                className="relative grid place-items-center"
                style={{ width: 22, height: 22 }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    border: "1px solid var(--ap-teal)",
                    opacity: 0.5,
                    borderRadius: "50%",
                  }}
                />
                <span
                  style={{
                    width: 9,
                    height: 9,
                    background: "var(--ap-teal)",
                    borderRadius: "50%",
                    outline: "1.5px solid var(--ap-bg)",
                  }}
                />
              </span>
            </Marker>
          ))}

        {selectedAt && <SelectedMarker at={selectedAt} />}

        {hover && (
          <Popup longitude={hover.lng} latitude={hover.lat} closeButton={false} closeOnClick={false} offset={14}>
            <span className="text-[12.5px]">
              {layer === "risk" ? "Risk" : layer !== "none" && LAYER[layer].label}{" "}
              <strong>{layer !== "none" && LAYER[layer].format(hover.value)}</strong>
            </span>
          </Popup>
        )}

        {children}

        {interactive && <NavigationControl position="top-right" showCompass={false} />}
        {interactive && <ScaleControl position="bottom-left" maxWidth={90} unit="metric" />}
      </Map>

      {mapError && (
        <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-1.5 text-[12.5px] shadow-pop backdrop-blur max-w-[90%] text-center text-extreme-ink">
          Map could not load: {mapError}
        </div>
      )}

      {error && !mapError && (
        <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-1.5 text-[12.5px] shadow-pop backdrop-blur text-muted">
          Risk layer unavailable right now
        </div>
      )}

      {noData && !error && !mapError && (
        <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-1.5 text-[12.5px] shadow-pop backdrop-blur text-muted">
          No {LAYER[layer].label} data for the region right now
        </div>
      )}

      {!payload && !error && layer !== "none" && (
        <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-1.5 text-[12.5px] shadow-pop backdrop-blur text-muted">
          Loading the risk layer&hellip;
        </div>
      )}

      {legend && layer !== "none" && layer !== "risk" && field?.domain && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1 rounded-[12px] bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-2 text-[11.5px] text-muted shadow-pop backdrop-blur-md">
          <span className="font-semibold text-ink">{LAYER[layer].label}</span>
          <span
            className="h-2 w-[180px] rounded-full"
            style={{ background: `linear-gradient(to right, ${LAYER[layer].ramp.join(", ")})`, opacity: 0.9 }}
          />
          <span className="flex justify-between tabular-nums">
            <span>
              {LAYER[layer].format(field.domain[0])} · {LAYER[layer].ends[0]}
            </span>
            <span>
              {LAYER[layer].ends[1]} · {LAYER[layer].format(field.domain[1])}
            </span>
          </span>
        </div>
      )}

      {legend && layer === "risk" && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-1.5 text-[12px] text-muted shadow-pop backdrop-blur-md">
          {(
            [
              ["Safe", "#38A88A"],
              ["Watch", "#E7A83B"],
              ["Severe", "#EE8434"],
              ["Extreme", "#D96565"],
            ] as const
          ).map(([l, c]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The spot the drawer is describing: a ring with a soft pulse, centred on the click. */
function SelectedMarker({ at }: { at: [number, number] }) {
  return (
    <Marker longitude={at[0]} latitude={at[1]} anchor="center">
      <span className="pointer-events-none relative grid size-6 place-items-center">
        <span className="absolute inset-0 animate-[pulse-ring_1.6s_ease-out_infinite] rounded-full border-2 border-white" />
        <span className="size-4 rounded-full border-[3px] border-white bg-[var(--ap-accent)] shadow-[0_1px_4px_rgb(0_0_0/0.55)]" />
      </span>
    </Marker>
  );
}

/**
 * Keyless satellite raster (ESRI World Imagery) with ESRI's transparent
 * boundaries-and-places layer on top, so towns and borders stay named.
 *
 * Imagery has no water layer to slot the risk surface beneath, and the ~9 km
 * model cells overhang the coast in blocks. So a water fill from OpenFreeMap
 * (keyless OpenMapTiles vectors) is drawn over the surface in the sea's own
 * colour, so the surface stops at the coastline and the lakes.
 */
export const SATELLITE_WATER = "sat-water";
export const SATELLITE_LABELS = "esri-labels";
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    },
    ofm: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution: "&copy; OpenMapTiles &copy; OpenStreetMap contributors",
    },
    "esri-labels": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
    },
  },
  layers: [
    { id: "esri", type: "raster", source: "esri" },
    {
      id: SATELLITE_WATER,
      type: "fill",
      source: "ofm",
      "source-layer": "water",
      paint: { "fill-color": "#0e2330", "fill-antialias": true },
    },
    { id: SATELLITE_LABELS, type: "raster", source: "esri-labels" },
  ],
};
