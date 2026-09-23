"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon, type IconName } from "@/components/icon";
import { MapView, type MapCell } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import { Blueprint, Button, Toggle } from "@/components/ui/primitives";
import { RiskBadge } from "@/components/ui/primitives";

type Layer = "risk" | "ndvi" | "none";
type Tool = "select" | "draw" | "measure";

const SURFACES: { id: Layer; label: string; ramp: string }[] = [
  { id: "risk", label: "Drought risk", ramp: "linear-gradient(90deg,#38A88A,#E7A83B,#EE8434,#D96565)" },
  { id: "ndvi", label: "NDVI", ramp: "linear-gradient(90deg,#9C7A45,#B8A04A,#2E9B55)" },
  { id: "none", label: "None", ramp: "transparent" },
];

const TOOLS: { id: Tool; label: string; icon: IconName }[] = [
  { id: "select", label: "Select", icon: "crosshair" },
  { id: "draw", label: "Draw area", icon: "polygon" },
  { id: "measure", label: "Measure", icon: "ruler" },
];

export function PageLiveMap() {
  const { site } = useConsole();
  const [layer, setLayer] = React.useState<Layer>("risk");
  const [base, setBase] = React.useState<"topo" | "sat">("topo");
  const [water, setWater] = React.useState(true);
  const [sensors, setSensors] = React.useState(true);
  const [labels, setLabels] = React.useState(true);
  const [op, setOp] = React.useState(45);
  const [tool, setTool] = React.useState<Tool>("draw");
  const [cell, setCell] = React.useState<MapCell | null>(null);
  const [drawn, setDrawn] = React.useState(true);
  const [drawer, setDrawer] = React.useState(true);
  const [day, setDay] = React.useState(0);

  const isArea = !cell;
  const d = new Date(2026, 8, 23 + day);
  const dayLabel = day ? `+${day}d · ${d.getDate()} ${["Sep", "Oct"][d.getMonth() - 8] ?? "Oct"}` : "Today · 23 Sep";

  const stats: [string, string][] = isArea
    ? [
        ["AREA", "38.6 km²"],
        ["PERIMETER", "25.1 km"],
        ["NDVI MEAN", "0.27"],
        ["SOIL MOIST.", "12.8 %"],
        ["SPEI-3", "−1.71"],
        ["LST", "35.2 °C"],
      ]
    : [
        ["NDVI", cell.ndvi.toFixed(2)],
        ["SOIL MOIST.", `${(22 - cell.score / 6).toFixed(1)} %`],
        ["SPEI-3", (-cell.score / 38).toFixed(2)],
        ["LST", `${(29 + cell.score / 12).toFixed(1)} °C`],
        ["LAND USE", cell.score > 55 ? "Cereal" : "Pasture"],
        ["ELEVATION", `${18 + (cell.score % 40)} m`],
      ];

  const score = isArea ? 61 : cell.score;

  return (
    <div className="relative h-full min-h-[640px] w-full overflow-hidden">
      <MapView
        layer={layer}
        base={base}
        water={water}
        sensors={sensors}
        labels={labels}
        drawn={drawn}
        opacity={op / 100}
        selected={cell?.id ?? null}
        onCell={(c) => {
          setCell(c);
          setDrawer(true);
          setTool("select");
        }}
        className="absolute inset-0"
      />

      {/* ── Layer panel ───────────────────────────────────────────────── */}
      <Blueprint className="absolute left-5 top-5 w-[272px] max-w-[calc(100vw-40px)] bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] backdrop-blur-lg">
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

        <div className="flex flex-col gap-1 px-3.5 py-3">
          <div className="mb-0.5 font-mono text-[10px] tracking-[0.1em] text-faint">OVERLAYS</div>
          {(
            [
              ["Water bodies", "waves", water, setWater],
              ["Sensor stations", "radio", sensors, setSensors],
              ["Place labels", "pin", labels, setLabels],
            ] as const
          ).map(([label, icon, value, set]) => (
            <div
              key={label}
              className="flex h-[30px] items-center gap-2.5 px-2 text-[13px] transition-colors hover:bg-neutral-100"
            >
              <span className="text-muted">
                <Icon name={icon as IconName} size={14} />
              </span>
              <span className="flex-1">{label}</span>
              <Toggle checked={value} onChange={set} label={label} />
            </div>
          ))}
        </div>
      </Blueprint>

      {/* ── Tool bar ──────────────────────────────────────────────────── */}
      <div className="absolute left-1/2 top-5 hidden -translate-x-1/2 border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] backdrop-blur-lg md:flex">
        {TOOLS.map((t) => {
          const on = tool === t.id;
          return (
            <button
              key={t.id}
              title={t.label}
              onClick={() => {
                setTool(t.id);
                if (t.id === "draw") {
                  setDrawn(true);
                  setDrawer(true);
                  setCell(null);
                }
              }}
              className="flex h-[34px] items-center gap-1.5 border-r border-divider px-3 text-[12.5px] transition-colors last:border-r-0 hover:text-ink"
              style={{ background: on ? "var(--ap-s3)" : "transparent", color: on ? "var(--ap-text)" : "var(--ap-muted)" }}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Base map + zoom ───────────────────────────────────────────── */}
      <div
        className="absolute top-5 hidden flex-col items-end gap-2.5 transition-[right] duration-250 ease-out lg:flex"
        style={{ right: drawer ? 380 : 20 }}
      >
        <div className="flex border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)]">
          {(
            [
              ["topo", "Topography", "mountain"],
              ["sat", "Satellite", "satellite"],
            ] as const
          ).map(([id, label, icon], i) => {
            const on = base === id;
            return (
              <button
                key={id}
                onClick={() => setBase(id)}
                className="flex h-8 items-center gap-1.5 px-2.75 text-[12.5px] transition-colors"
                style={{
                  borderLeft: i ? "1px solid var(--ap-divider)" : undefined,
                  background: on ? "var(--ap-s3)" : "transparent",
                  color: on ? "var(--ap-text)" : "var(--ap-muted)",
                }}
              >
                <Icon name={icon as IconName} size={14} />
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)]">
          <button className="grid size-[34px] place-items-center transition-colors hover:bg-neutral-100" aria-label="Zoom in">
            <Icon name="plus" size={15} />
          </button>
          <button
            className="grid size-[34px] place-items-center border-t border-divider transition-colors hover:bg-neutral-100"
            aria-label="Zoom out"
          >
            <span className="h-px w-3 bg-current" />
          </button>
          <button
            className="grid size-[34px] place-items-center border-t border-divider transition-colors hover:bg-neutral-100"
            aria-label="Recentre"
          >
            <Icon name="crosshair" size={15} />
          </button>
        </div>
      </div>

      {/* ── Scale + ramp ──────────────────────────────────────────────── */}
      <div className="absolute bottom-5 left-5 hidden items-center gap-3.5 border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] px-3 py-2 font-mono text-[10.5px] text-muted xl:flex">
        {layer !== "ndvi" ? (
          <span className="flex items-center gap-2.5">
            RISK
            {(
              [
                ["<25", "#38A88A"],
                ["25–50", "#E7A83B"],
                ["50–75", "#EE8434"],
                [">75", "#D96565"],
              ] as const
            ).map(([l, c]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="size-2" style={{ background: c }} />
                {l}
              </span>
            ))}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            NDVI 0.1
            <span
              className="h-2 w-[120px]"
              style={{ background: "linear-gradient(90deg,#9C7A45,#B8A04A,#7FB24E,#2E9B55)" }}
            />
            0.6
          </span>
        )}
        <span className="h-3.5 w-px bg-divider" />
        <span>0 &#9472;&#9472;&#9472; 2 km</span>
        <span>{cell ? `${cell.lat}°N ${cell.lon}°E` : "37.142°N 9.781°E"}</span>
      </div>

      {/* ── Forecast scrubber ─────────────────────────────────────────── */}
      <div className="absolute bottom-5 left-1/2 flex w-[min(420px,calc(100vw-40px))] -translate-x-1/2 items-center gap-3 border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_92%,transparent)] px-3.5 py-2 backdrop-blur-lg">
        <span className="font-mono text-[10.5px] text-muted">FORECAST</span>
        <input
          type="range"
          min={0}
          max={30}
          value={day}
          onChange={(e) => setDay(+e.target.value)}
          className="flex-1"
          aria-label="Forecast day"
        />
        <span className="w-24 text-right font-mono text-[11.5px]">{dayLabel}</span>
      </div>

      {/* ── Inspection drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {drawer && (
          <motion.aside
            initial={{ x: 380 }}
            animate={{ x: 0 }}
            exit={{ x: 380 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="absolute inset-y-0 right-0 flex w-[min(360px,100vw)] flex-col border-l border-divider bg-surface"
          >
            <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4.5">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
                  {isArea ? "DRAWN AREA · POLYGON" : "GRID CELL · 1 KM²"}
                </span>
                <span className="font-heading text-2xl font-semibold leading-[1.05]">
                  {isArea ? "Mateur plain, north" : `Cell ${cell.id}`}
                </span>
                <span className="font-mono text-[11px] text-muted">
                  {isArea ? "5 vertices · centroid 37.118°N 9.822°E" : `${cell.lat}°N ${cell.lon}°E`}
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
                  <span className="font-mono text-[10px] tracking-[0.1em] text-muted">MEAN RISK</span>
                  <span className="font-heading text-[52px] font-semibold leading-none tabular-nums">{score}</span>
                </div>
                <RiskBadge score={score} showScore={false} />
              </div>

              <div className="grid grid-cols-2 border-l border-t border-divider">
                {stats.map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5 border-b border-r border-divider px-3 py-2.5">
                    <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</span>
                    <span className="font-mono text-[15px]">{v}</span>
                  </div>
                ))}
              </div>

              {isArea && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] tracking-[0.1em] text-muted">AREA BY RISK CLASS</span>
                  <div className="flex h-2.5 gap-0.5">
                    <div className="flex-[4.1]" style={{ background: "#38A88A" }} />
                    <div className="flex-[11.8]" style={{ background: "#E7A83B" }} />
                    <div className="flex-[17.3]" style={{ background: "#EE8434" }} />
                    <div className="flex-[5.4]" style={{ background: "#D96565" }} />
                  </div>
                  <div className="grid grid-cols-4 font-mono text-[11px]">
                    <span>4.1 km&sup2;</span>
                    <span>11.8</span>
                    <span>17.3</span>
                    <span>5.4</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-[0.1em] text-muted">RISK &middot; LAST 60 DAYS</span>
                <svg viewBox="0 0 300 70" preserveAspectRatio="none" className="block h-[70px] w-full border-b border-divider">
                  <path
                    d="M0 52 L30 50 L60 47 L90 44 L120 40 L150 38 L180 33 L210 30 L240 27 L270 24 L300 20"
                    fill="none"
                    stroke="#EE8434"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <path d="M0 35H300" stroke="var(--ap-muted)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

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
    </div>
  );
}
