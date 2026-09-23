"use client";

import * as React from "react";
import Map, { Layer, Marker, NavigationControl, Popup, ScaleControl, Source, type MapRef } from "react-map-gl/maplibre";
import type {
  DataDrivenPropertyValueSpecification,
  FilterSpecification,
  StyleSpecification,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/components/theme-provider";
import { STATIONS } from "@/lib/climate";

/**
 * The real map: MapLibre GL over CARTO's keyless vector basemap, tinted
 * toward the APWRS palette so it sits inside the design rather than beside
 * it. The drought layer is a live GeoJSON surface from /api/grid, scored by
 * the entropy weight method.
 */

const BASE_STYLE = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
} as const;

export const DEFAULT_VIEW = { longitude: 9.55, latitude: 37.13, zoom: 8.6 };

/** west, south, east, north — react-map-gl takes the flat form. */
const MAX_BOUNDS: [number, number, number, number] = [8.4, 36.3, 10.8, 37.9];

/** Risk ramp, matching the badge and every chart. */
const RISK_RAMP: DataDrivenPropertyValueSpecification<string> = [
  "interpolate",
  ["linear"],
  ["get", "risk"],
  0, "#38A88A",
  25, "#38A88A",
  40, "#E7A83B",
  60, "#EE8434",
  80, "#D96565",
  100, "#D96565",
] as unknown as DataDrivenPropertyValueSpecification<string>;

export interface MapCell {
  id: string;
  score: number;
  lat: string;
  lon: string;
  precip30: number | null;
  et030: number | null;
  tmax: number | null;
  soilMoisture: number | null;
}

interface GridResponse {
  generatedAt: string;
  source: string;
  weights: Record<string, number>;
  factors: { key: string; label: string; note?: string }[];
  geojson: FeatureCollection;
}

export interface MapViewProps {
  layer?: "risk" | "none";
  base?: "map" | "satellite";
  sensors?: boolean;
  legend?: boolean;
  opacity?: number;
  selected?: string | null;
  onCell?: (cell: MapCell) => void;
  interactive?: boolean;
  className?: string;
  /** Lifts the loaded surface to the page (weights, provenance). */
  onSurface?: (info: Omit<GridResponse, "geojson">) => void;
}

/** One fetch per page, shared by every map on it. */
let gridPromise: Promise<GridResponse> | null = null;
function loadGrid(): Promise<GridResponse> {
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

export function MapView({
  layer = "risk",
  base = "map",
  sensors = false,
  legend = false,
  opacity = 0.55,
  selected = null,
  onCell,
  interactive = true,
  className,
  onSurface,
}: MapViewProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  const mapRef = React.useRef<MapRef | null>(null);

  const [grid, setGrid] = React.useState<FeatureCollection | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<{ lng: number; lat: number; risk: number } | null>(null);

  React.useEffect(() => {
    if (layer === "none") return;
    let live = true;
    loadGrid()
      .then((d) => {
        if (!live) return;
        setGrid(d.geojson);
        onSurface?.({
          generatedAt: d.generatedAt,
          source: d.source,
          weights: d.weights,
          factors: d.factors,
        });
      })
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [layer, onSurface]);

  const style = React.useMemo<string | StyleSpecification>(
    () => (base === "satellite" ? SATELLITE_STYLE : BASE_STYLE[dark ? "dark" : "light"]),
    [base, dark],
  );

  const selectedFilter = React.useMemo<FilterSpecification>(
    () =>
      selected
        ? ["==", ["concat", ["to-string", ["get", "lat"]], ",", ["to-string", ["get", "lon"]]], selected]
        : ["==", ["get", "risk"], -1],
    [selected],
  );

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <Map
        ref={mapRef}
        mapStyle={style}
        initialViewState={DEFAULT_VIEW}
        maxBounds={MAX_BOUNDS}
        minZoom={6}
        maxZoom={13}
        interactive={interactive}
        attributionControl={{ compact: true }}
        interactiveLayerIds={onCell ? ["risk-fill"] : []}
        cursor={onCell ? "pointer" : "grab"}
        onMouseMove={(e) => {
          const f = e.features?.[0];
          setHover(
            f && typeof f.properties?.risk === "number"
              ? { lng: e.lngLat.lng, lat: e.lngLat.lat, risk: f.properties.risk }
              : null,
          );
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const f = e.features?.[0];
          if (!f || !onCell) return;
          const p = f.properties as Record<string, number>;
          onCell({
            id: `${p.lat},${p.lon}`,
            score: p.risk,
            lat: Number(p.lat).toFixed(3),
            lon: Number(p.lon).toFixed(3),
            precip30: p.precip30 ?? null,
            et030: p.et030 ?? null,
            tmax: p.tmax ?? null,
            soilMoisture: p.soilMoisture ?? null,
          });
        }}
        style={{ width: "100%", height: "100%" }}
      >
        {grid && layer !== "none" && (
          <Source id="risk" type="geojson" data={grid}>
            <Layer
              id="risk-fill"
              type="fill"
              paint={{
                "fill-color": RISK_RAMP,
                "fill-opacity": opacity,
                "fill-antialias": false,
              }}
            />
            <Layer
              id="risk-outline"
              type="line"
              paint={{ "line-color": dark ? "#0B2633" : "#ffffff", "line-width": 0.4, "line-opacity": 0.35 }}
            />
            <Layer
              id="risk-selected"
              type="line"
              filter={selectedFilter}
              paint={{ "line-color": dark ? "#E6F1F5" : "#142B35", "line-width": 2 }}
            />
          </Source>
        )}

        {sensors &&
          STATIONS.map((s) => (
            <Marker key={s.id} longitude={s.lon} latitude={s.lat} anchor="center">
              <span
                title={`${s.id} · ${s.name}`}
                className="grid place-items-center"
                style={{ width: 22, height: 22 }}
              >
                <span
                  style={{
                    position: "absolute",
                    width: 22,
                    height: 22,
                    border: "1px solid var(--ap-teal)",
                    opacity: 0.45,
                    borderRadius: "50%",
                  }}
                />
                <span
                  style={{
                    width: 9,
                    height: 9,
                    background: "var(--ap-teal)",
                    outline: "1.5px solid var(--ap-bg)",
                  }}
                />
              </span>
            </Marker>
          ))}

        {hover && (
          <Popup
            longitude={hover.lng}
            latitude={hover.lat}
            closeButton={false}
            closeOnClick={false}
            offset={12}
            className="ap-popup"
          >
            <span className="font-mono text-[11px]">risk {hover.risk}</span>
          </Popup>
        )}

        {interactive && <NavigationControl position="top-right" showCompass={false} />}
        {interactive && <ScaleControl position="bottom-left" maxWidth={90} unit="metric" />}
      </Map>

      {error && (
        <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] px-3 py-1.5 font-mono text-[10.5px] text-muted backdrop-blur">
          live risk surface unavailable &middot; basemap only
        </div>
      )}

      {!grid && !error && layer !== "none" && (
        <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] px-3 py-1.5 font-mono text-[10.5px] text-muted backdrop-blur">
          loading risk surface&hellip;
        </div>
      )}

      {legend && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2.5 border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-2.5 py-[7px] font-mono text-[10px] uppercase tracking-[0.06em] text-muted backdrop-blur-md">
          {(
            [
              ["Safe", "#38A88A"],
              ["Watch", "#E7A83B"],
              ["Severe", "#EE8434"],
              ["Extreme", "#D96565"],
            ] as const
          ).map(([l, c]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="size-2" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Keyless satellite raster (ESRI World Imagery), styled as a MapLibre source. */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Imagery &copy; Esri",
    },
  },
  layers: [{ id: "esri", type: "raster", source: "esri" }],
};
