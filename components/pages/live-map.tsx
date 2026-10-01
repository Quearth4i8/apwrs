"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView, type MapCell, type SurfaceInfo } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { Panel, Button, RiskBadge, Toggle } from "@/components/ui/primitives";
import { STATIONS } from "@/lib/climate";

type Layer = "risk" | "none";

const SURFACES: { id: Layer; label: string; ramp: string }[] = [
  { id: "risk", label: "Drought risk", ramp: "linear-gradient(90deg,#38A88A,#E7A83B,#EE8434,#D96565)" },
  { id: "none", label: "None", ramp: "transparent" },
];

export function PageLiveMap() {
  const { site } = useConsole();
  const [layer, setLayer] = React.useState<Layer>("risk");
  const [stations, setStations] = React.useState(true);
  const [op, setOp] = React.useState(55);
  const [cell, setCell] = React.useState<MapCell | null>(null);
  const [drawer, setDrawer] = React.useState(false);
  const [surface, setSurface] = React.useState<SurfaceInfo | null>(null);

  const onSurface = React.useCallback((info: SurfaceInfo) => setSurface(info), []);

  const fmt = (v: number | null, digits: number, unit: string) =>
    v == null ? "—" : `${v.toFixed(digits)} ${unit}`;

  /* Every figure is the value the model actually scored for this cell. */
  const stats: [string, string][] = cell
    ? [
        ["Rain", fmt(cell.precip30, 1, "mm")],
        ["Evaporation", fmt(cell.et030, 1, "mm")],
        [
          "Rain − evaporation",
          fmt(cell.precip30 != null && cell.et030 != null ? cell.precip30 - cell.et030 : null, 1, "mm"),
        ],
        ["Soil moisture", fmt(cell.soilMoisture != null ? cell.soilMoisture * 100 : null, 1, "%")],
        ["Daytime high", fmt(cell.tmax, 1, "°C")],
      ]
    : [];

  return (
    <div className="relative h-full min-h-[640px] w-full overflow-hidden">
      <MapView
        layer={layer}
        sensors={stations}
        opacity={op / 100}
        selected={cell?.id ?? null}
        onSurface={onSurface}
        onCell={(c) => {
          setCell(c);
          setDrawer(true);
        }}
        className="absolute inset-0"
      />

      {/* ── Layer panel ───────────────────────────────────────────────── */}
      <Panel className="absolute left-5 top-5 z-10 w-[272px] max-w-[calc(100vw-40px)] bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] backdrop-blur-lg">
        <div className="flex items-center gap-2 border-b border-divider px-4 py-3">
          <Icon name="layers" size={16} />
          <span className="text-[15px] font-semibold">Layers</span>
          <span className="ml-auto text-[12px] text-muted">{site.name}</span>
        </div>

        <div className="flex flex-col gap-1.5 border-b border-divider px-3.5 py-3">
          <div className="mb-0.5 px-0.5 text-[12px] font-medium text-faint">Show on the map</div>
          {SURFACES.map((o) => {
            const on = layer === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setLayer(o.id)}
                aria-pressed={on}
                className="flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] transition-colors hover:bg-neutral-100"
                style={{ background: on ? "var(--ap-accent-100)" : undefined, fontWeight: on ? 600 : 400 }}
              >
                <span className="grid size-4 place-items-center rounded-full border-2" style={{ borderColor: on ? "var(--ap-accent)" : "var(--ap-divider-strong)" }}>
                  <span className="size-1.5 rounded-full" style={{ background: on ? "var(--ap-accent)" : "transparent" }} />
                </span>
                <span className="flex-1 text-left">{o.label}</span>
                <span className="h-2 w-10 rounded-full" style={{ background: o.ramp }} />
              </button>
            );
          })}
          <label className="mt-1.5 flex items-center gap-2.5 px-0.5 text-[12.5px] text-muted">
            <span>Opacity</span>
            <input
              type="range"
              min={10}
              max={90}
              value={op}
              onChange={(e) => setOp(+e.target.value)}
              className="flex-1"
              aria-label="Layer opacity"
            />
            <span className="w-[30px] text-right text-ink">{op}%</span>
          </label>
        </div>

        <div className="flex flex-col gap-1 border-b border-divider px-3.5 py-3">
          <div className="mb-0.5 px-0.5 text-[12px] font-medium text-faint">Extras</div>
          <div className="flex h-[30px] items-center gap-2.5 px-2 text-[13px]">
            <span className="text-muted">
              <Icon name="radio" size={14} />
            </span>
            <span className="flex-1">Weather stations</span>
            <Toggle checked={stations} onChange={setStations} label="Ground stations" />
          </div>
        </div>

        {/* The weights are computed, not chosen — worth showing. */}
        <div className="flex flex-col gap-1.5 px-3.5 py-3">
          <div className="px-0.5 text-[12px] font-medium text-faint">What the risk is made of</div>
          {surface ? (
            surface.factors.map((f) => {
              const w = surface.weights[f.key] ?? 0;
              return (
                <div key={f.key} className="flex items-center gap-2 text-[12px]">
                  <span className="flex-1 truncate" title={f.note ? `${f.label} — ${f.note}` : f.label}>
                    {f.label}
                    {f.note?.startsWith("stands in") && <span className="text-faint"> *</span>}
                  </span>
                  <span className="h-1.5 w-14 rounded-full bg-neutral-100">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${w * 100}%` }} />
                  </span>
                  <span className="w-8 text-right text-[12px] font-semibold tabular-nums">{(w * 100).toFixed(0)}%</span>
                </div>
              );
            })
          ) : (
            <span className="text-[12px] text-muted">Working it out&hellip;</span>
          )}
          {surface && (
            <span className="mt-1 text-[11.5px] leading-[1.4] text-faint">* stands in for a satellite measurement not yet connected</span>
          )}
        </div>
      </Panel>

      {/* ── Provenance ────────────────────────────────────────────────── */}
      {surface && (
        <div className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-3 rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-4 py-2 text-[12.5px] text-muted shadow-pop backdrop-blur-lg lg:flex">
          <Icon name="refresh" size={14} />
          <span>
            Updated{" "}
            {new Date(surface.generatedAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="h-3 w-px bg-divider" />
          <span>Weather{(surface.ndvi?.coverage ?? 0) > 0 ? " + satellite vegetation" : ""}, ~{surface.resolutionKm} km grid</span>
        </div>
      )}

      {/* ── Inspection drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {drawer && cell && (
          <motion.aside
            initial={{ x: 380 }}
            animate={{ x: 0 }}
            exit={{ x: 380 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="absolute inset-y-3 right-3 z-10 flex w-[min(360px,calc(100vw-24px))] flex-col overflow-hidden rounded-[16px] border border-panel-border bg-surface shadow-pop"
          >
            <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4.5">
              <div className="flex flex-col gap-1">
                <span className="text-[20px] font-semibold leading-tight">This spot</span>
                <span className="text-[12.5px] text-muted">
                  {cell.lat}&deg;N {cell.lon}&deg;E &middot; last 30 days
                </span>
              </div>
              <button
                onClick={() => {
                  setDrawer(false);
                  setCell(null);
                }}
                aria-label="Close panel"
                className="grid size-9 flex-none place-items-center rounded-full bg-neutral-100 text-muted transition-colors hover:text-ink"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto p-5">
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

              {surface && (
                <div className="flex flex-col gap-2">
                  <span className="text-[13.5px] font-semibold">How the score is made</span>
                  <p className="m-0 text-[13px] leading-[1.5] text-muted">
                    It compares this spot with the rest of the region today. Measurements that vary the most across
                    the region count the most; nothing is weighted by hand.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" className="h-[34px] flex-1">
                  <Icon name="download" size={14} />
                  Export GeoJSON
                </Button>
                <Button size="sm" variant="primary" className="h-[34px] flex-1">
                  Save as zone
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Station key ───────────────────────────────────────────────── */}
      {stations && (
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
