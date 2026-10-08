"use client";

import * as React from "react";
import Map, { Layer, Marker, NavigationControl, Popup, ScaleControl, Source, type MapRef } from "react-map-gl/maplibre";
import type * as GeoJSON from "geojson";
import { boundsOf, loadBasin, type BasinGeo } from "@/components/basin-map";
import { MAX_BOUNDS, SATELLITE_LABELS, SATELLITE_STYLE, SATELLITE_WATER, loadGrid, lockToPlan, type GridPayload } from "@/components/map-view";
import { STATIONS } from "@/lib/climate";
import { BASIN } from "@/lib/basin";
import { LAYER, domainOf, rampAt, type LayerKey } from "@/lib/map-layers";
import { RISK_COLOR, RISK_LABEL, riskLevel } from "@/lib/utils";
import { LandPin, LAND_FILL, LAND_LINE, LAND_SELECTED } from "@/components/land-pin";
import { landsGeoJSON, type Land } from "@/lib/lands";

/**
 * The Ichkeul catchment as on the Overview — its outline from the study
 * shapefile and its 29 sections — but each section coloured by one of the
 * risk surface's layers: drought risk, NDVI or NDWI.
 *
 * Farmers' fields can be drawn on top, each with a pin that opens it.
 *
 * The risk grid is coarser than the sections (20 × 16 samples over the whole
 * region), so a section's value is the mean of the grid blended bilinearly
 * at points across it — the same blend the risk raster uses. The fill sits beneath the water layer, so the lake and the sea
 * mask it, as on every other map.
 */

type Ring = number[][];

/** Ray casting, holes respected. */
function inPolygon(x: number, y: number, rings: Ring[]) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function polygonsOf(g: GeoJSON.Polygon | GeoJSON.MultiPolygon): Ring[][] {
  return g.type === "Polygon" ? [g.coordinates as Ring[]] : (g.coordinates as Ring[][]);
}

function centreOf(rings: Ring[][]): [number, number] {
  const pts = rings.flatMap((p) => p[0]);
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
}

interface Sampled {
  id: string;
  km2: number;
  v: number | null;
  /** How many of the probe points inside the section had a value. */
  samples: number;
}

/**
 * The layer at a point, blended from the four grid samples around it — the
 * same bilinear blend the risk raster uses. Water samples (no risk)
 * are left out and the rest re-weighted; null if all four are water.
 */
function bilinear(grid: GridPayload, values: (number | null)[], lon: number, lat: number): number | null {
  const { rows, cols } = grid.grid;
  const { minLat, maxLat, minLon, maxLon } = grid.region;
  const gx = ((lon - minLon) / (maxLon - minLon)) * (cols - 1);
  const gy = ((lat - minLat) / (maxLat - minLat)) * (rows - 1);
  if (gx < 0 || gy < 0 || gx > cols - 1 || gy > rows - 1) return null;
  const c0 = Math.min(cols - 2, Math.floor(gx));
  const r0 = Math.min(rows - 2, Math.floor(gy));
  const fx = gx - c0;
  const fy = gy - r0;
  let sum = 0;
  let wsum = 0;
  for (const [dr, dc, w] of [
    [0, 0, (1 - fx) * (1 - fy)],
    [0, 1, fx * (1 - fy)],
    [1, 0, (1 - fx) * fy],
    [1, 1, fx * fy],
  ] as const) {
    const k = (r0 + dr) * cols + c0 + dc;
    const v = values[k];
    if (v == null || grid.grid.risk[k] == null || w === 0) continue;
    sum += v * w;
    wsum += w;
  }
  return wsum > 0 ? sum / wsum : null;
}

/** Each section's mean of `layer`, probed on a 5 × 5 lattice over its land. */
function sampleSections(basin: BasinGeo, grid: GridPayload, layer: LayerKey): Sampled[] {
  const values = (grid.grid[layer] ?? []) as (number | null)[];
  const N = 5;
  return basin.features
    .filter((f) => f.properties?.kind === "section")
    .map((f) => {
      const rings = polygonsOf(f.geometry);
      const pts = rings.flatMap((p) => p[0]);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const [w, e, s, n] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const got: number[] = [];
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const x = w + ((i + 0.5) / N) * (e - w);
          const y = s + ((j + 0.5) / N) * (n - s);
          if (!rings.some((r) => inPolygon(x, y, r))) continue;
          const v = bilinear(grid, values, x, y);
          if (v != null) got.push(v);
        }
      }
      // A sliver too thin for the lattice: read its centre.
      if (!got.length) {
        const [cx, cy] = centreOf(rings);
        const v = bilinear(grid, values, cx, cy);
        if (v != null) got.push(v);
      }
      return {
        id: String(f.properties?.id),
        km2: Number(f.properties?.km2 ?? 0),
        v: got.length ? got.reduce((a, b) => a + b, 0) / got.length : null,
        samples: got.length,
      };
    });
}

export function BasinLayerMap({
  layer,
  className,
  lands = [],
  selectedLand = null,
  onLand,
  focus = null,
}: {
  /** The layer to colour the sections by, or "none" for the outline alone. */
  layer: LayerKey | "none";
  className?: string;
  /** Farmers' fields, drawn over the sections with a pin each. */
  lands?: Land[];
  selectedLand?: string | null;
  onLand?: (l: Land) => void;
  /** Fly to these bounds [west, south, east, north] whenever they change. */
  focus?: [number, number, number, number] | null;
}) {
  const mapRef = React.useRef<MapRef | null>(null);

  React.useEffect(() => {
    if (focus) mapRef.current?.fitBounds(focus, { padding: 80, maxZoom: 16.5, duration: 1300 });
  }, [focus]);
  const [basin, setBasin] = React.useState<BasinGeo | null>(null);
  const [grid, setGrid] = React.useState<GridPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<{ lng: number; lat: number; id: string } | null>(null);

  React.useEffect(() => {
    let live = true;
    Promise.all([loadBasin(), loadGrid()])
      .then(([b, g]) => {
        if (!live) return;
        setBasin(b);
        setGrid(g);
      })
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, []);

  const plain = layer === "none";
  const def = LAYER[plain ? "risk" : layer];
  const sections = React.useMemo(
    () => (basin && grid && layer !== "none" ? sampleSections(basin, grid, layer) : []),
    [basin, grid, layer],
  );
  const domain = React.useMemo(() => domainOf(def, sections.map((s) => s.v)), [def, sections]);
  const byId = React.useMemo(() => new globalThis.Map(sections.map((s) => [s.id, s])), [sections]);

  const colorOf = React.useCallback(
    (v: number | null) => {
      if (v == null || !domain) return "#8a8f93";
      // Risk in its four bands, matching the legend and the gauge.
      if (layer === "risk") return RISK_COLOR[riskLevel(v)];
      const [r, g, b] = rampAt(def.ramp, (v - domain[0]) / (domain[1] - domain[0]));
      return `rgb(${r},${g},${b})`;
    },
    [def, domain, layer],
  );

  // The basin with each section's colour baked in, so the map paints straight from it.
  const painted = React.useMemo<BasinGeo | null>(() => {
    if (!basin) return null;
    return {
      ...basin,
      features: basin.features.map((f) =>
        f.properties?.kind === "section"
          ? { ...f, properties: { ...f.properties, color: colorOf(byId.get(String(f.properties.id))?.v ?? null) } }
          : f,
      ),
    };
  }, [basin, byId, colorOf]);

  const bounds = React.useMemo(() => (basin ? boundsOf(basin) : null), [basin]);
  const fit = React.useCallback(() => {
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 36, duration: 0 });
  }, [bounds]);
  React.useEffect(fit, [fit]);

  const hovered = hover ? byId.get(hover.id) : null;
  const values = sections.map((s) => s.v).filter((v): v is number => v != null);
  const mean = values.length ? sections.reduce((a, s) => a + (s.v ?? 0) * s.km2, 0) / sections.reduce((a, s) => a + (s.v == null ? 0 : s.km2), 0) : null;

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <Map
        ref={mapRef}
        mapStyle={SATELLITE_STYLE}
        initialViewState={{ longitude: 9.48, latitude: 37.06, zoom: 9 }}
        maxBounds={MAX_BOUNDS}
        minZoom={7}
        maxZoom={18}
        attributionControl={{ compact: true }}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        maxPitch={0}
        onLoad={(e) => {
          lockToPlan(e);
          fit();
        }}
        interactiveLayerIds={painted ? ["layer-fill"] : []}
        onMouseMove={(e) => {
          const f = e.features?.[0];
          setHover(f ? { lng: e.lngLat.lng, lat: e.lngLat.lat, id: String(f.properties?.id) } : null);
        }}
        onMouseLeave={() => setHover(null)}
        cursor={hover ? "pointer" : "grab"}
        style={{ width: "100%", height: "100%" }}
      >
        {painted && (
          <Source id="basin-layer" type="geojson" data={painted}>
            <Layer
              id="layer-fill"
              type="fill"
              beforeId={SATELLITE_WATER}
              filter={["==", ["get", "kind"], "section"]}
              paint={{
                "fill-color": ["coalesce", ["get", "color"], "#000000"],
                // "No layer": the sections stay hoverable, just unfilled.
                "fill-opacity": plain ? 0 : 0.62,
                "fill-opacity-transition": { duration: 400 },
              }}
            />
            <Layer
              id="layer-cells"
              type="line"
              beforeId={SATELLITE_LABELS}
              filter={["==", ["get", "kind"], "section"]}
              paint={{ "line-color": "#ffffff", "line-opacity": 0.35, "line-width": 0.6 }}
            />
            <Layer
              id="layer-hover"
              type="line"
              beforeId={SATELLITE_LABELS}
              filter={["all", ["==", ["get", "kind"], "section"], ["==", ["get", "id"], hover?.id ?? ""]]}
              paint={{ "line-color": "#ffffff", "line-width": 2.2 }}
            />
            <Layer
              id="layer-outline-casing"
              type="line"
              beforeId={SATELLITE_LABELS}
              filter={["==", ["get", "kind"], "outline"]}
              paint={{ "line-color": "#0b1a22", "line-opacity": 0.55, "line-width": 4.5, "line-blur": 1 }}
            />
            <Layer
              id="layer-outline"
              type="line"
              beforeId={SATELLITE_LABELS}
              filter={["==", ["get", "kind"], "outline"]}
              paint={{ "line-color": "#ffffff", "line-width": 2 }}
            />
          </Source>
        )}

        {lands.length > 0 && (
          <Source id="farm-lands" type="geojson" data={landsGeoJSON(lands, selectedLand)}>
            <Layer
              id="farm-lands-fill"
              type="fill"
              beforeId={SATELLITE_LABELS}
              paint={{ "fill-color": ["case", ["get", "selected"], LAND_SELECTED, LAND_FILL], "fill-opacity": 0.4 }}
            />
            <Layer
              id="farm-lands-line"
              type="line"
              beforeId={SATELLITE_LABELS}
              paint={{
                "line-color": ["case", ["get", "selected"], LAND_SELECTED, LAND_LINE],
                "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 15, 2.5],
              }}
            />
          </Source>
        )}
        {lands.map((l) => (
          <Marker key={l.id} longitude={l.center[0]} latitude={l.center[1]} anchor="bottom">
            <span
              onClick={(e) => {
                e.stopPropagation(); // a field click is not a section hover
                onLand?.(l);
              }}
            >
              <LandPin active={l.id === selectedLand} label={`${l.name} · ${l.ownerName}`} />
            </span>
          </Marker>
        ))}

        {STATIONS.map((s) => (
          <Marker key={s.id} longitude={s.lon} latitude={s.lat} anchor="center">
            <span
              title={`${s.id} · ${s.name}`}
              className="block size-[11px] rounded-full"
              style={{ background: "var(--ap-teal)", outline: "2px solid #fff", boxShadow: "0 0 0 4px rgb(0 0 0 / 0.25)" }}
            />
          </Marker>
        ))}

        {hover && plain && (
          <Popup longitude={hover.lng} latitude={hover.lat} closeButton={false} closeOnClick={false} offset={14}>
            <span className="text-[12.5px] font-semibold">{hover.id}</span>
          </Popup>
        )}
        {hover && hovered && !plain && (
          <Popup longitude={hover.lng} latitude={hover.lat} closeButton={false} closeOnClick={false} offset={14} maxWidth="240px">
            <div className="flex flex-col gap-1 text-[12.5px]">
              <span className="font-semibold">{hovered.id}</span>
              <span>
                {def.label} <strong>{hovered.v == null ? "—" : def.format(hovered.v)}</strong>
              </span>
              {layer === "risk" && hovered.v != null && (
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-full" style={{ background: RISK_COLOR[riskLevel(hovered.v)] }} />
                  {RISK_LABEL[riskLevel(hovered.v)]}
                </span>
              )}
              <span className="text-muted">
                {hovered.km2.toFixed(0)} km² ·{" "}
                {`mean of ${hovered.samples} point${hovered.samples === 1 ? "" : "s"} across the section`}
              </span>
            </div>
          </Popup>
        )}

        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-right" maxWidth={90} unit="metric" />
      </Map>

      {/* Legend, with the catchment-wide figure. */}
      {!plain && (
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-120px)] flex-col gap-1.5 rounded-[12px] bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-2 text-[11.5px] text-muted shadow-pop backdrop-blur-md">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-ink">{def.label}</span>
          <span>
            Ichkeul catchment · {BASIN.areaKm2.toLocaleString("en-GB")} km²
            {mean != null && <> · mean {def.format(mean)}</>}
          </span>
        </span>
        {layer === "risk" ? (
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {(["safe", "watch", "severe", "extreme"] as const).map((l) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: RISK_COLOR[l] }} />
                {RISK_LABEL[l]}
              </span>
            ))}
          </span>
        ) : (
          domain && (
            <>
              <span className="h-2 w-[200px] rounded-full" style={{ background: `linear-gradient(to right, ${def.ramp.join(", ")})` }} />
              <span className="flex w-[200px] justify-between tabular-nums">
                <span>
                  {def.format(domain[0])} · {def.ends[0]}
                </span>
                <span>
                  {def.ends[1]} · {def.format(domain[1])}
                </span>
              </span>
            </>
          )
        )}
      </div>
      )}

      {(error || !painted || (!grid && !plain)) && (
        <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-1.5 text-[12.5px] text-muted shadow-pop backdrop-blur">
          {error ? "This layer is unavailable right now" : "Loading the catchment…"}
        </div>
      )}
    </div>
  );
}
