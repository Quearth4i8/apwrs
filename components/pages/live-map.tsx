"use client";

import * as React from "react";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView, SATELLITE_LABELS, loadGrid, type GridPayload, type MapCell, type SurfaceInfo } from "@/components/map-view";
import { CropImage } from "@/components/crop-visual";
import { LandPin, LAND_FILL, LAND_LINE, LAND_SELECTED } from "@/components/land-pin";
import { useConsole } from "@/components/app-context";
import { Panel, Button, RiskBadge, Toggle } from "@/components/ui/primitives";
import { STATIONS } from "@/lib/climate";
import { calendarCrop } from "@/lib/crop-calendar";
import { LAYER, MAP_LAYERS, type LayerKey } from "@/lib/map-layers";
import { LayerSwitcher } from "@/components/layer-switcher";
import { cellFor, impactsAt } from "@/lib/impact";
import { bounds, landsGeoJSON, useLands, type Land } from "@/lib/lands";

/**
 * The expert's map: every gridded layer the app computes, the weather
 * stations, and every farmer's field as drawn on the farmer's My fields
 * screen. Click a cell for its conditions, or a field for its owner, crop,
 * area and the conditions on it.
 */

type Shown = LayerKey | "none";
type Drawer = { kind: "cell"; cell: MapCell } | { kind: "land"; id: string } | null;

export function PageLiveMap() {
  const { site } = useConsole();
  const [layer, setLayer] = React.useState<Shown>("risk");
  const [stations, setStations] = React.useState(true);
  const [showLands, setShowLands] = React.useState(true);
  const [settings, setSettings] = React.useState(false);
  const [op, setOp] = React.useState(55);
  const [drawer, setDrawer] = React.useState<Drawer>(null);
  const [focus, setFocus] = React.useState<[number, number, number, number] | null>(null);
  const [surface, setSurface] = React.useState<SurfaceInfo | null>(null);
  const [payload, setPayload] = React.useState<GridPayload | null>(null);
  const { lands } = useLands();

  const onSurface = React.useCallback((info: SurfaceInfo) => setSurface(info), []);
  React.useEffect(() => {
    let live = true;
    loadGrid()
      .then((p) => live && setPayload(p))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const list = lands ?? [];
  const selectedLand = drawer?.kind === "land" ? (list.find((l) => l.id === drawer.id) ?? null) : null;
  const openLand = (l: Land) => {
    setDrawer({ kind: "land", id: l.id });
    setFocus(bounds(l.polygon));
  };

  return (
    <div className="relative h-full min-h-[640px] w-full overflow-hidden">
      <MapView
        layer={layer}
        sensors={stations}
        legend
        opacity={op / 100}
        selectedAt={drawer?.kind === "cell" ? drawer.cell.at : null}
        onSurface={onSurface}
        onCell={(c) => setDrawer({ kind: "cell", cell: c })}
        focus={focus}
        className="absolute inset-0"
      >
        {showLands && list.length > 0 && (
          <>
            <Source id="lands" type="geojson" data={landsGeoJSON(list, selectedLand?.id)}>
              <Layer
                id="lands-fill"
                type="fill"
                beforeId={SATELLITE_LABELS}
                paint={{ "fill-color": ["case", ["get", "selected"], LAND_SELECTED, LAND_FILL], "fill-opacity": 0.38 }}
              />
              <Layer
                id="lands-line"
                type="line"
                beforeId={SATELLITE_LABELS}
                paint={{
                  "line-color": ["case", ["get", "selected"], LAND_SELECTED, LAND_LINE],
                  "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 15, 2.5],
                }}
              />
            </Source>
            {list.map((l) => (
              <Marker key={l.id} longitude={l.center[0]} latitude={l.center[1]} anchor="bottom">
                <span
                  onClick={(e) => {
                    e.stopPropagation(); // a field click is not a cell click
                    openLand(l);
                  }}
                >
                  <LandPin active={l.id === selectedLand?.id} label={`${l.name} · ${l.ownerName}`} />
                </span>
              </Marker>
            ))}
          </>
        )}
      </MapView>

      {/* ── Layer picker and settings ─────────────────────────────────── */}
      <div className="absolute left-5 top-5 z-10 flex w-[288px] max-w-[calc(100vw-40px)] flex-col items-start gap-2.5">
        <div className="flex items-center gap-2">
          {layer === "none" ? (
            <button
              type="button"
              onClick={() => setLayer("risk")}
              className="flex h-9 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_90%,transparent)] pl-2 pr-3.5 text-[13px] shadow-pop backdrop-blur-md transition-colors hover:bg-[var(--ap-bg)]"
            >
              <span className="grid size-6 place-items-center rounded-full bg-neutral-100 text-muted">
                <Icon name="layers" size={14} />
              </span>
              <span className="font-semibold">No layer</span>
              <span className="text-muted">· show</span>
            </button>
          ) : (
            <LayerSwitcher value={layer} onChange={setLayer} />
          )}
          <button
            type="button"
            onClick={() => setSettings((v) => !v)}
            aria-expanded={settings}
            aria-label="Map settings"
            className={`grid size-9 place-items-center rounded-full shadow-pop backdrop-blur-md transition-colors ${
              settings
                ? "bg-[var(--ap-accent)] text-white"
                : "bg-[color-mix(in_srgb,var(--ap-bg)_90%,transparent)] text-ink hover:bg-[var(--ap-bg)]"
            }`}
          >
            <motion.span animate={{ rotate: settings ? 90 : 0 }} transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}>
              <Icon name="settings" size={16} />
            </motion.span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {settings && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ originX: 0, originY: 0 }}
              className="w-full"
            >
              <Panel className="flex max-h-[calc(100vh-220px)] flex-col overflow-hidden bg-[color-mix(in_srgb,var(--ap-bg)_94%,transparent)] backdrop-blur-lg">
                <div className="flex items-center justify-between border-b border-divider px-4 py-2.5">
                  <span className="text-[13.5px] font-semibold">Map settings</span>
                  <span className="text-[12px] text-muted">{site.name}</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-1 border-b border-divider px-3.5 py-3">
                    <label className="flex items-center gap-2.5 px-0.5 text-[12.5px] text-muted">
                      <span>Layer opacity</span>
                      <input
                        type="range"
                        min={10}
                        max={90}
                        value={op}
                        disabled={layer === "none"}
                        onChange={(e) => setOp(+e.target.value)}
                        className="flex-1"
                        aria-label="Layer opacity"
                      />
                      <span className="w-[30px] text-right text-ink">{op}%</span>
                    </label>
                    <div className="mt-1 flex h-[30px] items-center gap-2.5 px-0.5 text-[13px]">
                      <span className="text-muted">
                        <Icon name="layers" size={14} />
                      </span>
                      <span className="flex-1">Data layer</span>
                      <Toggle checked={layer !== "none"} onChange={(v) => setLayer(v ? "risk" : "none")} label="Data layer" />
                    </div>
                    <div className="flex h-[30px] items-center gap-2.5 px-0.5 text-[13px]">
                      <span className="text-muted">
                        <Icon name="radio" size={14} />
                      </span>
                      <span className="flex-1">Weather stations</span>
                      <Toggle checked={stations} onChange={setStations} label="Weather stations" />
                    </div>
                    <div className="flex h-[30px] items-center gap-2.5 px-0.5 text-[13px]">
                      <span className="text-muted">
                        <Icon name="map" size={14} />
                      </span>
                      <span className="flex-1">
                        Farmers&apos; fields <span className="text-muted">({list.length})</span>
                      </span>
                      <Toggle checked={showLands} onChange={setShowLands} label="Farmers' fields" />
                    </div>
                  </div>

                  {/* Every field, to jump to. */}
                  <AnimatePresence initial={false}>
                    {showLands && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-1 px-3 py-3">
                          <div className="mb-0.5 px-1 text-[12px] font-medium text-faint">Fields</div>
                          {lands == null ? (
                            <span className="px-1 text-[12px] text-muted">Loading&hellip;</span>
                          ) : list.length === 0 ? (
                            <span className="px-1 text-[12px] leading-snug text-muted">
                              No fields yet. Farmers draw theirs on the My fields screen of the farmer view.
                            </span>
                          ) : (
                            list.map((l) => {
                              const on = l.id === selectedLand?.id;
                              return (
                                <button
                                  key={l.id}
                                  onClick={() => openLand(l)}
                                  className={`flex items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 ${on ? "bg-accent-100" : ""}`}
                                >
                                  <span
                                    className="size-2.5 flex-none rounded-[3px] border"
                                    style={{ background: `${LAND_FILL}66`, borderColor: LAND_LINE }}
                                  />
                                  <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-[13px] font-medium">{l.name}</span>
                                    <span className="truncate text-[11.5px] text-muted">{l.ownerName}</span>
                                  </span>
                                  <span className="text-[11.5px] text-muted tabular-nums">{l.areaHa.toFixed(1)} ha</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Provenance ────────────────────────────────────────────────── */}
      {surface && (
        <div className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-3 rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-4 py-2 text-[12.5px] text-muted shadow-pop backdrop-blur-lg 2xl:flex">
          <Icon name="refresh" size={14} />
          <span>
            Updated{" "}
            {new Date(surface.generatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="h-3 w-px bg-divider" />
          <span>
            Weather{(surface.ndvi?.coverage ?? 0) > 0 ? " + satellite vegetation" : ""}, ~{surface.resolutionKm} km grid
          </span>
        </div>
      )}

      {/* ── Drawers ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {drawer?.kind === "cell" && (
          <Drawer key={`cell-${drawer.cell.id}`} onClose={() => setDrawer(null)} title="This spot" sub={`${drawer.cell.lat}°N ${drawer.cell.lon}°E · last 30 days`}>
            <CellBody cell={drawer.cell} explain={!!surface} />
          </Drawer>
        )}
        {selectedLand && (
          <Drawer key={`land-${selectedLand.id}`} onClose={() => setDrawer(null)} title={selectedLand.name} sub={`Field of ${selectedLand.ownerName}`}>
            <LandBody land={selectedLand} payload={payload} onZoom={() => setFocus(bounds(selectedLand.polygon))} />
          </Drawer>
        )}
      </AnimatePresence>

      {/* ── Station key ───────────────────────────────────────────────── */}
      {stations && !drawer && (
        <div className="absolute right-5 top-[104px] z-10 hidden flex-col gap-1.5 rounded-[14px] bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-3.5 py-3 shadow-pop backdrop-blur-lg xl:flex">
          <span className="text-[12px] font-medium text-faint">Weather stations</span>
          {STATIONS.map((s) => (
            <span key={s.id} className="flex items-center gap-2 text-[13px]">
              <span className="size-2.5 rounded-full bg-teal" />
              {s.name}
            </span>
          ))}
          <span className="text-[11.5px] text-faint">Daily weather, 1996&ndash;2025</span>
        </div>
      )}
    </div>
  );
}

function Drawer({ title, sub, onClose, children }: { title: string; sub: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.aside
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      exit={{ x: 380 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      className="absolute inset-y-3 right-3 z-10 flex w-[min(360px,calc(100vw-24px))] flex-col overflow-hidden rounded-[16px] border border-panel-border bg-surface shadow-pop"
    >
      <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[20px] font-semibold leading-tight">{title}</span>
          <span className="truncate text-[12.5px] text-muted">{sub}</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="grid size-9 flex-none place-items-center rounded-full bg-neutral-100 text-muted transition-colors hover:text-ink"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-5 overflow-y-auto p-5">{children}</div>
    </motion.aside>
  );
}

function CellBody({ cell, explain }: { cell: MapCell; explain: boolean }) {
  const fmt = (v: number | null, digits: number, unit: string) => (v == null ? "—" : `${v.toFixed(digits)} ${unit}`);
  /* Every figure is the value the model actually scored for this cell. */
  const stats: [string, string][] = [
    ["Rain", fmt(cell.precip30, 1, "mm")],
    ["Evaporation", fmt(cell.et030, 1, "mm")],
    ["Rain − evaporation", fmt(cell.precip30 != null && cell.et030 != null ? cell.precip30 - cell.et030 : null, 1, "mm")],
    ["Soil moisture", fmt(cell.soilMoisture != null ? cell.soilMoisture * 100 : null, 1, "%")],
    ["Daytime high", fmt(cell.tmax, 1, "°C")],
  ];
  return (
    <>
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">Drought risk, 0 to 100</span>
          <span className="text-[48px] font-semibold leading-none tabular-nums">{cell.score}</span>
        </div>
        <RiskBadge score={cell.score} showScore={false} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
            <span className="text-[12.5px] text-muted">{k}</span>
            <span className="text-[16px] font-semibold tabular-nums">{v}</span>
          </div>
        ))}
      </div>
      {explain && (
        <div className="flex flex-col gap-2">
          <span className="text-[13.5px] font-semibold">How the score is made</span>
          <p className="m-0 text-[13px] leading-[1.5] text-muted">
            It compares this spot with the rest of the region today. Measurements that vary the most across the region count the most;
            nothing is weighted by hand.
          </p>
        </div>
      )}
    </>
  );
}

/** A field: who farms it, what is on it, and every map layer's value at its centre. */
function LandBody({ land, payload, onZoom }: { land: Land; payload: GridPayload | null; onZoom: () => void }) {
  const crop = land.crop !== "none" ? calendarCrop(land.crop) : null;
  const i = payload ? cellFor(payload, land.center[1], land.center[0]) : null;
  const impacts = payload && i != null ? impactsAt(payload, i) : [];
  const impactOf = new Map(impacts.map((f) => [f.key, f]));
  const value = (k: LayerKey) => (payload && i != null ? ((payload.grid[k] as (number | null)[] | undefined)?.[i] ?? null) : null);
  const risk = value("risk");

  const download = () => {
    const blob = new Blob([JSON.stringify(landsGeoJSON([land]), null, 1)], { type: "application/geo+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${land.name.replace(/[^\w-]+/g, "_")}.geojson`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2 flex items-center gap-3 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
          {crop ? <CropImage crop={crop} className="size-10 flex-none rounded-full" iconSize={16} /> : <Icon name="sprout" size={20} />}
          <span className="flex flex-col">
            <span className="text-[12.5px] text-muted">Crop</span>
            <span className="text-[15px] font-semibold">{crop ? crop.name : "None / fallow"}</span>
          </span>
        </div>
        <Stat k="Area" v={`${land.areaHa.toFixed(2)} ha`} />
        <Stat k="Corners" v={String(land.polygon.length)} />
        <Stat k="Centre" v={`${land.center[1].toFixed(4)}, ${land.center[0].toFixed(4)}`} />
        <Stat k="Updated" v={new Date(land.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="flex items-center justify-between">
          <span className="text-[13.5px] font-semibold">Conditions on this field</span>
          {risk != null && <RiskBadge score={risk} />}
        </span>
        {!payload ? (
          <span className="text-[12.5px] text-muted">Loading the layers&hellip;</span>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[24px_minmax(0,1fr)_auto_64px] gap-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">
              <span />
              <span>Factor</span>
              <span className="text-right">Value</span>
              <span className="text-right">Impact</span>
            </div>
            {MAP_LAYERS.filter((l) => l.key !== "risk").map((l, n) => {
              const v = value(l.key);
              const f = impactOf.get(l.key);
              return (
                <div
                  key={l.key}
                  className="grid grid-cols-[24px_minmax(0,1fr)_auto_64px] items-center gap-2.5 border-b border-divider py-2 text-[13px] last:border-b-0"
                >
                  <span className="h-2 w-6 rounded-full" style={{ background: `linear-gradient(to right, ${l.ramp.join(", ")})` }} />
                  <span className="truncate text-muted" title={f ? `Weight ${(f.weight * 100).toFixed(0)}%` : "Not part of the risk score"}>
                    {l.label}
                  </span>
                  <span className="text-right font-semibold tabular-nums">{v == null ? "—" : LAYER[l.key].format(v)}</span>
                  {f ? (
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: "#EE8434" }}>
                        {f.impact.toFixed(0)}%
                      </span>
                      <span className="h-1 w-full rounded-full bg-neutral-100">
                        <motion.span
                          className="block h-full rounded-full"
                          style={{ background: "#EE8434" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${f.impact}%` }}
                          transition={{ duration: 0.6, delay: 0.1 + n * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                        />
                      </span>
                    </span>
                  ) : (
                    <span className="text-right text-[12px] text-faint">—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <span className="text-[11.5px] leading-snug text-faint">
          Impact = wₖ·dₖ ÷ Σ wⱼ·dⱼ: each factor&apos;s entropy weight wₖ times how dry the field is on it, dₖ (0 wettest, 1 driest in the
          region), as a share of the risk score. Factors marked — are shown but not scored. Read from the ~{payload?.resolutionKm ?? 9} km
          grid cell under the field&apos;s centre.
        </span>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="h-[34px] flex-1" onClick={download}>
          <Icon name="download" size={14} />
          Export GeoJSON
        </Button>
        <Button size="sm" variant="primary" className="h-[34px] flex-1" onClick={onZoom}>
          <Icon name="search" size={14} />
          Zoom to field
        </Button>
      </div>
    </>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
      <span className="text-[12.5px] text-muted">{k}</span>
      <span className="truncate text-[14.5px] font-semibold tabular-nums">{v}</span>
    </div>
  );
}
