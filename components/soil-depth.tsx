"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Panel, Segmented } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { HoverGuide, HoverReadout, useBarHover, useElementWidth } from "@/components/ui/chart-hover";
import { BASIN, WATER_CLASSES, monthLabel, waterClass } from "@/lib/basin";

/**
 * Soil water at four depths over the Ichkeul catchment, from ERA5-Land
 * (lib/basin.ts): a soil profile for the latest month, coloured by how wet
 * each layer is for the time of year, and every month on record as lines.
 *
 * "vs normal" is the percentile against the same calendar month in
 * 1991–2020 — the reading that removes the seasons. "Water content" is the
 * volumetric water itself, m³/m³ shown as %.
 */

type Mode = "pct" | "vol";

const EASE = [0.2, 0.8, 0.2, 1] as const;
/** Shallow to deep: light to dark. */
const LINE = ["#8CC7D9", "#4FA3C7", "#2F7FD1", "#1F4E9E"];
const last = BASIN.months.length - 1;

export function SoilDepth() {
  const [mode, setMode] = React.useState<Mode>("pct");
  const [focus, setFocus] = React.useState<string | null>(null);
  const layers = BASIN.layers;

  return (
    <Panel className="flex flex-col gap-5 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Soil water by depth</span>
          <span className="text-[13px] text-muted">
            Ichkeul catchment · ERA5-Land · {monthLabel(BASIN.months[0])} to {monthLabel(BASIN.months[last])}
          </span>
        </span>
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "pct", label: "vs normal" },
            { value: "vol", label: "Water content" },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Profile focus={focus} onFocus={setFocus} />
        <div className="flex min-w-0 flex-col gap-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <History mode={mode} focus={focus} />
            </motion.div>
          </AnimatePresence>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
            {layers.map((l, i) => (
              <button
                key={l.key}
                type="button"
                onMouseEnter={() => setFocus(l.key)}
                onMouseLeave={() => setFocus(null)}
                onClick={() => setFocus((f) => (f === l.key ? null : l.key))}
                className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors ${focus === l.key ? "bg-neutral-100 text-ink" : ""}`}
              >
                <span className="h-[3px] w-4 rounded-full" style={{ background: LINE[i] }} />
                {l.label}
              </button>
            ))}
            {mode === "pct" && (
              <span className="ml-auto flex items-center gap-1.5">
                {WATER_CLASSES.map((c) => (
                  <span key={c.label} className="flex items-center gap-1">
                    <span className="size-2 rounded-[2px]" style={{ background: c.color, opacity: 0.5 }} />
                    {c.label}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      <Provenance>
        ERA5-Land monthly means, Copernicus Climate Change Service · area-weighted over the catchment&apos;s {BASIN.sections} sections ·
        percentiles against the same month, 1991–2020
      </Provenance>
    </Panel>
  );
}

/* ── The soil profile, latest month ──────────────────────────────────── */

function Profile({ focus, onFocus }: { focus: string | null; onFocus: (k: string | null) => void }) {
  const layers = BASIN.layers;
  const total = layers.reduce((a, l) => a + l.cm, 0);
  // Drawn to depth, but no layer thinner than a readable band.
  const H = 300;
  const MIN = 46;
  const raw = layers.map((l) => (l.cm / total) * H);
  const extra = raw.reduce((a, h) => a + Math.max(0, MIN - h), 0);
  const big = raw.filter((h) => h > MIN).reduce((a, h) => a + h, 0);
  const heights = raw.map((h) => (h < MIN ? MIN : h - (extra * h) / big));

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between text-[12px] text-muted">
        <span className="font-semibold uppercase tracking-[0.06em]">Profile · {monthLabel(BASIN.months[last])}</span>
      </span>
      <div className="flex gap-2.5">
        {/* depth ruler */}
        <div className="relative w-9 flex-none text-[10.5px] text-faint tabular-nums">
          {layers.map((l, i) => {
            const top = heights.slice(0, i).reduce((a, h) => a + h, 0);
            const depth = layers.slice(0, i).reduce((a, x) => a + x.cm, 0);
            return (
              <span key={l.key} className="absolute right-0" style={{ top: top - 6 }}>
                {depth} cm
              </span>
            );
          })}
          <span className="absolute right-0" style={{ top: H - 6 }}>
            {total} cm
          </span>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-[12px] border border-divider">
          {/* the surface */}
          <div className="h-2.5 bg-[repeating-linear-gradient(90deg,#6AB04C_0_3px,#8CC56B_3px_6px)]" />
          {layers.map((l, i) => {
            const pct = l.pct[last];
            const cls = waterClass(pct);
            const dim = focus != null && focus !== l.key;
            return (
              <motion.button
                key={l.key}
                type="button"
                onMouseEnter={() => onFocus(l.key)}
                onMouseLeave={() => onFocus(null)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: dim ? 0.45 : 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
                className="relative flex flex-col justify-center gap-0.5 border-t border-[color-mix(in_srgb,var(--ap-text)_10%,transparent)] px-3 text-left"
                style={{
                  height: heights[i],
                  background: `linear-gradient(90deg, color-mix(in srgb, ${cls?.color ?? "#8a8f93"} 38%, #c9a87c), color-mix(in srgb, ${cls?.color ?? "#8a8f93"} 22%, #b08a5c))`,
                }}
              >
                <span className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#2b2116]">
                  <span>{l.label}</span>
                  <span className="rounded-full bg-white/70 px-1.5 py-px text-[11px] tabular-nums">
                    {l.vol[last] == null ? "—" : `${Math.round(l.vol[last]! * 100)}% vol`}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-[11.5px] text-[#3b2e20]">
                  <span className="size-2 rounded-full" style={{ background: cls?.color ?? "#8a8f93" }} />
                  {cls ? cls.label : "—"}
                  {pct != null && <span className="opacity-75">· {ordinal(pct)} pct</span>}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Every month, every layer ────────────────────────────────────────── */

function History({ mode, focus }: { mode: Mode; focus: string | null }) {
  const layers = BASIN.layers;
  const months = BASIN.months;
  const [ref, W] = useElementWidth<HTMLDivElement>(760);
  const H = 300;
  const pad = { l: 40, r: 12, t: 12, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const slot = innerW / months.length;
  const x = (i: number) => pad.l + (i + 0.5) * slot;

  const series = layers.map((l) => (mode === "pct" ? l.pct : l.vol.map((v) => (v == null ? null : v * 100))));
  const all = series.flat().filter((v): v is number => v != null);
  const [lo, hi] = mode === "pct" ? [0, 100] : [Math.floor(Math.min(...all) / 5) * 5, Math.ceil(Math.max(...all) / 5) * 5];
  const y = (v: number) => pad.t + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
  const ticks = mode === "pct" ? [0, 30, 50, 70, 100] : Array.from({ length: (hi - lo) / 5 + 1 }, (_, k) => lo + k * 5);

  const hover = useBarHover(months.length, pad.l, pad.r, W);
  const at = hover.index;

  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={pad.l} right={pad.r} width={W}>
        {at != null && (
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">{monthLabel(months[at])}</span>
            {layers.map((l, i) => {
              const v = series[i][at];
              return (
                <span key={l.key} className="flex items-center gap-1.5">
                  <span className="h-[3px] w-3 rounded-full" style={{ background: LINE[i] }} />
                  {l.label}: {v == null ? "—" : mode === "pct" ? `${Math.round(v)}th pct · ${waterClass(v)?.label.toLowerCase()}` : `${v.toFixed(1)}% vol`}
                </span>
              );
            })}
          </span>
        )}
      </HoverReadout>
      <svg width={W} height={H} className="block">
        {/* the dry-to-wet bands behind the percentile lines */}
        {mode === "pct" &&
          WATER_CLASSES.map((c, k) => {
            const from = k === 0 ? 0 : WATER_CLASSES[k - 1].max;
            const to = Math.min(100, c.max);
            return <rect key={c.label} x={pad.l} y={y(to)} width={innerW} height={y(from) - y(to)} fill={c.color} fillOpacity={0.08} />;
          })}
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.07 }}>
          {ticks.map((t) => (
            <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
          ))}
        </g>

        <HoverGuide hover={hover} left={pad.l} right={pad.r} width={W} top={pad.t} bottom={pad.t + innerH} />

        {layers.map((l, i) => {
          const dim = focus != null && focus !== l.key;
          return (
            <motion.path
              key={l.key}
              d={path(series[i])}
              fill="none"
              stroke={LINE[i]}
              strokeWidth={focus === l.key ? 3 : 2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity={dim ? 0.2 : 1}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, delay: i * 0.12, ease: EASE }}
            />
          );
        })}
        {at != null &&
          layers.map((l, i) => {
            const v = series[i][at];
            return v == null ? null : (
              <circle key={l.key} cx={x(at)} cy={y(v)} r={4} fill={LINE[i]} style={{ stroke: "var(--ap-surface)" }} strokeWidth={2} />
            );
          })}

        <g style={{ fill: "var(--ap-muted)" }} fontSize={11.5}>
          {ticks.map((t) => (
            <text key={t} x={pad.l - 8} y={y(t) + 4} textAnchor="end">
              {t}
              {mode === "vol" ? "%" : ""}
            </text>
          ))}
          {months.map((m, i) =>
            m.endsWith("-01") || i === 0 ? (
              <text key={m} x={x(i)} y={H - 8} textAnchor="middle">
                {monthLabel(m, true)} {m.slice(0, 4)}
              </text>
            ) : null,
          )}
        </g>
      </svg>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
