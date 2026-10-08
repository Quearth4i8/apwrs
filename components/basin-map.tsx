"use client";

import * as React from "react";
import Map, { Layer, Marker, NavigationControl, ScaleControl, Source, type MapRef } from "react-map-gl/maplibre";
import type { LngLatBoundsLike } from "maplibre-gl";
import type * as GeoJSON from "geojson";
import { MAX_BOUNDS, SATELLITE_LABELS, SATELLITE_STYLE, SATELLITE_WATER, lockToPlan } from "@/components/map-view";
import { STATIONS } from "@/lib/climate";
import { BASIN } from "@/lib/basin";

/**
 * The Ichkeul catchment on the satellite basemap, as the study shapefile
 * draws it: the outline and the 29 sections inside it, and nothing else.
 * The Drought risk page colours the same sections by its layers
 * (components/basin-layer-map.tsx), reusing the loader and framing here.
 */

export type BasinGeo = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> & { month: string };

let basinPromise: Promise<BasinGeo> | null = null;
export function loadBasin(): Promise<BasinGeo> {
  basinPromise ??= fetch("/data/basin.geojson")
    .then((r) => {
      if (!r.ok) throw new Error(`basin ${r.status}`);
      return r.json();
    })
    .catch((e) => {
      basinPromise = null;
      throw e;
    });
  return basinPromise;
}

export function boundsOf(fc: BasinGeo): LngLatBoundsLike {
  let w = 180;
  let s = 90;
  let e = -180;
  let n = -90;
  const visit = (c: unknown): void => {
    if (typeof (c as number[])[0] === "number") {
      const [x, y] = c as number[];
      w = Math.min(w, x);
      e = Math.max(e, x);
      s = Math.min(s, y);
      n = Math.max(n, y);
    } else (c as unknown[]).forEach(visit);
  };
  for (const f of fc.features) if (f.properties?.kind === "outline") visit(f.geometry.coordinates);
  return [w, s, e, n];
}

export function BasinMap({ className }: { className?: string }) {
  const mapRef = React.useRef<MapRef | null>(null);
  const [data, setData] = React.useState<BasinGeo | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    loadBasin()
      .then((d) => live && setData(d))
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, []);

  const bounds = React.useMemo(() => (data ? boundsOf(data) : null), [data]);

  // Frame the catchment once both the map and its shape are in.
  const fit = React.useCallback(() => {
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 36, duration: 0 });
  }, [bounds]);
  React.useEffect(fit, [fit]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <Map
        ref={mapRef}
        mapStyle={SATELLITE_STYLE}
        initialViewState={{ longitude: 9.48, latitude: 37.06, zoom: 9 }}
        maxBounds={MAX_BOUNDS}
        minZoom={7}
        maxZoom={14}
        attributionControl={{ compact: true }}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        maxPitch={0}
        onLoad={(e) => {
          lockToPlan(e);
          fit();
        }}
        style={{ width: "100%", height: "100%" }}
      >
        {data && (
          <Source id="basin" type="geojson" data={data}>
            {/* A faint wash inside the catchment, so its extent reads at a glance. */}
            <Layer
              id="basin-wash"
              type="fill"
              beforeId={SATELLITE_WATER}
              filter={["==", ["get", "kind"], "outline"]}
              paint={{ "fill-color": "#ffffff", "fill-opacity": 0.08 }}
            />
            <Layer
              id="basin-cells"
              type="line"
              beforeId={SATELLITE_LABELS}
              filter={["==", ["get", "kind"], "section"]}
              paint={{ "line-color": "#ffffff", "line-opacity": 0.4, "line-width": 0.7 }}
            />
            {/* A dark casing under the white line keeps the outline legible over bright fields. */}
            <Layer
              id="basin-outline-casing"
              type="line"
              beforeId={SATELLITE_LABELS}
              filter={["==", ["get", "kind"], "outline"]}
              paint={{ "line-color": "#0b1a22", "line-opacity": 0.55, "line-width": 4.5, "line-blur": 1 }}
            />
            <Layer
              id="basin-outline"
              type="line"
              beforeId={SATELLITE_LABELS}
              filter={["==", ["get", "kind"], "outline"]}
              paint={{ "line-color": "#ffffff", "line-width": 2 }}
            />
          </Source>
        )}

        {STATIONS.map((s) => (
          <Marker key={s.id} longitude={s.lon} latitude={s.lat} anchor="center">
            <span
              title={`${s.id} · ${s.name}`}
              className="block size-[11px] rounded-full"
              style={{ background: "var(--ap-teal)", outline: "2px solid #fff", boxShadow: "0 0 0 4px rgb(0 0 0 / 0.25)" }}
            />
          </Marker>
        ))}

        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-right" maxWidth={90} unit="metric" />
      </Map>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-0.5 rounded-[12px] bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-2 shadow-pop backdrop-blur-md">
        <span className="text-[12.5px] font-semibold text-ink">Ichkeul catchment</span>
        <span className="text-[11.5px] text-muted">
          {BASIN.areaKm2.toLocaleString("en-GB")} km² · {BASIN.sections} sections
        </span>
      </div>

      {(error || !data) && (
        <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-1.5 text-[12.5px] text-muted shadow-pop backdrop-blur">
          {error ? "Catchment layer unavailable right now" : "Loading the catchment…"}
        </div>
      )}
    </div>
  );
}
