"use client";

import * as React from "react";
import Map, { Layer, Marker, NavigationControl, Popup, ScaleControl, Source, type MapRef } from "react-map-gl/maplibre";
import type { ExpressionSpecification, LngLatBoundsLike } from "maplibre-gl";
import type * as GeoJSON from "geojson";
import { MAX_BOUNDS, SATELLITE_LABELS, SATELLITE_STYLE, SATELLITE_WATER, lockToPlan } from "@/components/map-view";
import { STATIONS } from "@/lib/climate";
import { BASIN, WATER_CLASSES, monthLabel, waterClass } from "@/lib/basin";

/**
 * The Ichkeul catchment on the satellite basemap: its outline from the study
 * shapefile, and the 29 ERA5-Land sections inside it coloured by how their
 * root-zone soil water compares with the same month in 1991–2020.
 *
 * The fill sits beneath the water layer, so Lake Ichkeul and the sea mask it
 * just as they mask the risk surface on the other maps.
 */

interface SectionProps {
  kind: "section";
  id: string;
  km2: number;
  pct: number | null;
  mm: number | null;
  rain: number | null;
  rainNormal: number | null;
}

type BasinGeo = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> & { month: string };

let basinPromise: Promise<BasinGeo> | null = null;
function loadBasin(): Promise<BasinGeo> {
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

/** Percentile → class colour, the same steps as WATER_CLASSES. */
const FILL: ExpressionSpecification = [
  "case",
  ["==", ["get", "pct"], null],
  "#8a8f93",
  [
    "step",
    ["get", "pct"],
    WATER_CLASSES[0].color,
    ...WATER_CLASSES.slice(0, -1).flatMap((c, i) => [c.max, WATER_CLASSES[i + 1].color]),
  ] as unknown as ExpressionSpecification,
];

function boundsOf(fc: BasinGeo): LngLatBoundsLike {
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
  const [hover, setHover] = React.useState<{ lng: number; lat: number; p: SectionProps } | null>(null);

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

  const month = data?.month ?? BASIN.months[BASIN.months.length - 1];

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <Map
        ref={mapRef}
        mapStyle={SATELLITE_STYLE}
        initialViewState={{ longitude: 9.48, latitude: 37.06, zoom: 9 }}
        maxBounds={MAX_BOUNDS}
        minZoom={7}
        maxZoom={13}
        attributionControl={{ compact: true }}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        maxPitch={0}
        onLoad={(e) => {
          lockToPlan(e);
          fit();
        }}
        interactiveLayerIds={data ? ["basin-fill"] : []}
        onMouseMove={(e) => {
          const f = e.features?.[0];
          setHover(f ? { lng: e.lngLat.lng, lat: e.lngLat.lat, p: f.properties as SectionProps } : null);
        }}
        onMouseLeave={() => setHover(null)}
        cursor={hover ? "pointer" : "grab"}
        style={{ width: "100%", height: "100%" }}
      >
        {data && (
          <Source id="basin" type="geojson" data={data}>
            <Layer
              id="basin-fill"
              type="fill"
              beforeId={SATELLITE_WATER}
              filter={["==", ["get", "kind"], "section"]}
              paint={{ "fill-color": FILL, "fill-opacity": 0.58 }}
            />
            <Layer
              id="basin-cells"
              type="line"
              beforeId={SATELLITE_LABELS}
              filter={["==", ["get", "kind"], "section"]}
              paint={{ "line-color": "#ffffff", "line-opacity": 0.35, "line-width": 0.6 }}
            />
            <Layer
              id="basin-hover"
              type="line"
              beforeId={SATELLITE_LABELS}
              filter={["all", ["==", ["get", "kind"], "section"], ["==", ["get", "id"], hover?.p.id ?? ""]]}
              paint={{ "line-color": "#ffffff", "line-width": 2.2 }}
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

        {hover && <SectionPopup {...hover} />}

        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-right" maxWidth={90} unit="metric" />
      </Map>

      {/* What the colours show, and when. */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-0.5 rounded-[12px] bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-2 shadow-pop backdrop-blur-md">
        <span className="text-[12.5px] font-semibold text-ink">Soil water · {monthLabel(month)}</span>
        <span className="text-[11.5px] text-muted">
          Ichkeul catchment · {BASIN.areaKm2.toLocaleString("en-GB")} km² · {BASIN.sections} sections
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-1.5 text-[12px] text-muted shadow-pop backdrop-blur-md">
        {WATER_CLASSES.map((c) => (
          <span key={c.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
      </div>

      {(error || !data) && (
        <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-1.5 text-[12.5px] text-muted shadow-pop backdrop-blur">
          {error ? "Catchment layer unavailable right now" : "Loading the catchment…"}
        </div>
      )}
    </div>
  );
}

function SectionPopup({ lng, lat, p }: { lng: number; lat: number; p: SectionProps }) {
  const cls = waterClass(p.pct);
  return (
    <Popup longitude={lng} latitude={lat} closeButton={false} closeOnClick={false} offset={14} maxWidth="240px">
      <div className="flex flex-col gap-1 text-[12.5px]">
        <span className="flex items-center gap-2 font-semibold">
          {p.id}
          {cls && (
            <span className="flex items-center gap-1 font-normal text-muted">
              <span className="size-2 rounded-full" style={{ background: cls.color }} />
              {cls.label}
            </span>
          )}
        </span>
        {p.mm != null && (
          <span>
            Root zone <strong>{Math.round(p.mm)} mm</strong>
            {p.pct != null && <span className="text-muted"> · {ordinal(p.pct)} percentile</span>}
          </span>
        )}
        {p.rain != null && (
          <span>
            Rain <strong>{Math.round(p.rain)} mm</strong>
            {p.rainNormal != null && <span className="text-muted"> · normal {Math.round(p.rainNormal)} mm</span>}
          </span>
        )}
        <span className="text-muted">{p.km2.toFixed(0)} km² of the catchment</span>
      </div>
    </Popup>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
