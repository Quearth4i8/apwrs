"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView, type MapCell } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { Blueprint, Button, RiskBadge, Toggle } from "@/components/ui/primitives";
import { STATIONS } from "@/lib/climate";

type Layer = "risk" | "none";

interface SurfaceInfo {
  generatedAt: string;
  source: string;
  weights: Record<string, number>;
  factors: { key: string; label: string; note?: string }[];
}

const SURFACES: { id: Layer; label: string; ramp: string }[] = [
  { id: "risk", label: "Drought risk", ramp: "linear-gradient(90deg,#38A88A,#E7A83B,#EE8434,#D96565)" },
  { id: "none", label: "None", ramp: "transparent" },
];

export function PageLiveMap() {
  const { site } = useConsole();
  const [layer, setLayer] = React.useState<Layer>("risk");
  const [base, setBase] = React.useState<"map" | "satellite">("map");
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
        ["RAIN 30D", fmt(cell.precip30, 1, "mm")],
        ["ET₀ 30D", fmt(cell.et030, 1, "mm")],
        [
          "BALANCE",
          fmt(cell.precip30 != null && cell.et030 != null ? cell.precip30 - cell.et030 : null, 1, "mm"),
        ],
        ["SOIL MOIST.", fmt(cell.soilMoisture != null ? cell.soilMoisture * 100 : null, 1, "%")],
        ["MAX TEMP", fmt(cell.tmax, 1, "°C")],
        ["ELEVATION", "—"],
      ]
    : [];

  return (
    <div className="relative h-full min-h-[640px] w-full overflow-hidden">
      <MapView
        layer={layer}
        base={base}
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
      <Blueprint className="absolute left-5 top-5 z-10 w-[272px] max-w-[calc(100vw-40px)] bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] backdrop-blur-lg">
        <div className="flex items-center gap-2 border-b border-divider px-3.5 py-3">
          <Icon name="layers" size={15} />
          <span className="font-heading text-base font-semibold">Layers</span>
          <span className="ml-auto font-mono text-[10px] text-muted">{site.name}</span>
        </div>

        <div className="flex flex-col gap-1.5 border-b border-divider px-3.5 py-3">
          <div className="mb-0.5 font-mono text-[10px] tracking-[0.1em] text-faint">SURFACE LAYER</div>
          {SURFACES.map((o) => {
            const on = layer === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setLayer(o.id)}
                aria-pressed={on}
                className="flex h-[30px] items-center gap-2.5 border px-2 text-[13px] transition-colors hover:border-divider-strong"
                style={{
                  borderColor: on ? "color-mix(in srgb, var(--ap-accent) 40%, transparent)" : "transparent",
                  background: on ? "var(--ap-accent-100)" : "transparent",
                }}
              >
                <span className="grid size-3 place-items-center border border-divider-strong">
                  <span className="size-1.5" style={{ background: on ? "var(--ap-accent)" : "transparent" }} />
                </span>
                <span className="flex-1 text-left">{o.label}</span>
                <span className="h-1.5 w-10" style={{ background: o.ramp }} />
              </button>
            );
          })}
          <label className="mt-1.5 flex items-center gap-2.5 font-mono text-[10.5px] text-muted">
            <span>OPACITY</span>
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
          <div className="mb-0.5 font-mono text-[10px] tracking-[0.1em] text-faint">OVERLAYS</div>
          <div className="flex h-[30px] items-center gap-2.5 px-2 text-[13px]">
            <span className="text-muted">
              <Icon name="radio" size={14} />
            </span>
            <span className="flex-1">Ground stations</span>
            <Toggle checked={stations} onChange={setStations} label="Ground stations" />
          </div>
          <div className="flex h-[30px] items-center gap-2.5 px-2 text-[13px]">
            <span className="text-muted">
              <Icon name="satellite" size={14} />
            </span>
            <span className="flex-1">Satellite base</span>
            <Toggle
              checked={base === "satellite"}
              onChange={(v) => setBase(v ? "satellite" : "map")}
              label="Satellite base"
            />
          </div>
        </div>

        {/* The weights are computed, not chosen — worth showing. */}
        <div className="flex flex-col gap-1.5 px-3.5 py-3">
          <div className="font-mono text-[10px] tracking-[0.1em] text-faint">
            ENTROPY WEIGHTS
          </div>
          {surface ? (
            surface.factors.map((f) => {
              const w = surface.weights[f.key] ?? 0;
              return (
                <div key={f.key} className="flex items-center gap-2 text-[12px]">
                  <span className="flex-1 truncate" title={f.note ? `${f.label} — ${f.note}` : f.label}>
                    {f.label}
                    {f.note && <span className="text-faint"> *</span>}
                  </span>
                  <span className="h-1.5 w-14 bg-neutral-100">
                    <span className="block h-full bg-accent" style={{ width: `${w * 100}%` }} />
                  </span>
                  <span className="w-8 text-right font-mono text-[11px]">{(w * 100).toFixed(0)}%</span>
                </div>
              );
            })
          ) : (
            <span className="text-[12px] text-muted">computing&hellip;</span>
          )}
          {surface && (
            <span className="mt-1 font-mono text-[9.5px] leading-[1.4] text-faint">
              * proxy for a satellite band not yet wired up
            </span>
          )}
        </div>
      </Blueprint>

      {/* ── Provenance ────────────────────────────────────────────────── */}
      {surface && (
        <div className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-3 border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] px-3.5 py-2 font-mono text-[10.5px] text-muted backdrop-blur-lg lg:flex">
          <span className="size-1.5 bg-accent" />
          <span>{surface.source}</span>
          <span className="h-3 w-px bg-divider" />
          <span>updated {new Date(surface.generatedAt).toUTCString().slice(5, 22)} UTC</span>
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
            className="absolute inset-y-0 right-0 z-10 flex w-[min(360px,100vw)] flex-col border-l border-divider bg-surface"
          >
            <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4.5">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
                  GRID CELL &middot; OPEN-METEO
                </span>
                <span className="font-heading text-2xl font-semibold leading-[1.05]">Cell inspection</span>
                <span className="font-mono text-[11px] text-muted">
                  {cell.lat}&deg;N {cell.lon}&deg;E
                </span>
              </div>
              <button
                onClick={() => {
                  setDrawer(false);
                  setCell(null);
                }}
                aria-label="Close panel"
                className="grid size-[30px] flex-none place-items-center border border-divider transition-colors hover:border-divider-strong"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto p-5">
              <div className="flex items-end justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-[0.1em] text-muted">COMPOSITE RISK</span>
                  <span className="font-heading text-[52px] font-semibold leading-none tabular-nums">
                    {cell.score}
                  </span>
                </div>
                <RiskBadge score={cell.score} showScore={false} />
              </div>

              <div className="grid grid-cols-2 border-l border-t border-divider">
                {stats.map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5 border-b border-r border-divider px-3 py-2.5">
                    <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</span>
                    <span className="font-mono text-[15px]">{v}</span>
                  </div>
                ))}
              </div>

              {surface && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] tracking-[0.1em] text-muted">
                    HOW THIS SCORE WAS WEIGHTED
                  </span>
                  <p className="m-0 text-[12.5px] leading-[1.5] text-muted">
                    Weights come from the entropy of each factor across the whole grid, so the factor that varies
                    most across the region carries the most influence. Nothing here is set by hand.
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
        <div className="absolute right-5 top-[104px] z-10 hidden flex-col gap-1.5 border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] px-3 py-2.5 backdrop-blur-lg xl:flex">
          <span className="font-mono text-[10px] tracking-[0.1em] text-faint">GROUND STATIONS</span>
          {STATIONS.map((s) => (
            <span key={s.id} className="flex items-center gap-2 font-mono text-[10.5px] text-muted">
              <span className="size-2 bg-teal" />
              {s.id} &middot; {s.name}
              <span className="text-faint">
                {s.lat.toFixed(3)}&deg;N {s.lon.toFixed(3)}&deg;E
              </span>
            </span>
          ))}
          <span className="font-mono text-[9.5px] text-faint">30 y daily record &middot; 1996&ndash;2025</span>
        </div>
      )}
    </div>
  );
}
