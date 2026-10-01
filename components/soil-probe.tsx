"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Panel } from "@/components/ui/primitives";
import { useBarHover, HoverGuide, useElementWidth } from "@/components/ui/chart-hover";
import { LevelBar, LevelPill, moistureLevel } from "@/components/ui/simple";
import { useSoil } from "@/lib/use-soil";
import type { SoilProbe, SoilReading } from "@/lib/smartfarm";

/**
 * One colour per depth, used by the tiles, the chart lines and the hover
 * readout alike, so a depth is the same colour wherever it appears.
 * Categorical slots 1–3, validated in globals.css for both themes.
 */
const DEPTHS = [
  { key: "m20", color: "var(--ap-depth-1)" },
  { key: "m40", color: "var(--ap-depth-2)" },
  { key: "m60", color: "var(--ap-depth-3)" },
] as const;

const TZ = "Africa/Tunis";
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
const fmtClock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v)}%`);

/** All three channels read, i.e. the probe is in the ground and working. */
const inSoil = (r: SoilReading) => r.m20 != null && r.m40 != null && r.m60 != null;

/** Mean of the three depths: the one number the headline tiles show. */
export function rootZone(r: SoilReading) {
  return ((r.m20 ?? 0) + (r.m40 ?? 0) + (r.m60 ?? 0)) / 3;
}

/** The latest reading from the probe in the ground, or null while loading or on failure. */
export function useLatestSoil() {
  const { data, error } = useSoil();
  const latest = data ? ([...data.probe.readings].reverse().find(inSoil) ?? null) : null;
  return { probe: data?.probe ?? null, latest, error };
}

/* ── Overview card: a gauge row per depth ────────────────────────────── */

function DepthRows({ probe, reading }: { probe: SoilProbe; reading: SoilReading }) {
  return (
    <div className="flex flex-col gap-4">
      {DEPTHS.map((d, i) => {
        const v = reading[d.key];
        return (
          <div key={d.key} className="grid grid-cols-[52px_1fr_auto] items-center gap-3.5">
            <span className="text-[13.5px] text-muted">{probe.depths[i]} cm</span>
            <LevelBar pct={v} />
            <span className="flex w-[104px] items-center justify-end gap-2">
              <span className="text-[15px] font-semibold tabular-nums">{pct(v)}</span>
              {v != null && <LevelPill level={moistureLevel(v)} />}
            </span>
          </div>
        );
      })}
      <div className="flex justify-between pl-[66px] pr-[118px] text-[11.5px] text-faint">
        <span>Dry</span>
        <span>Good</span>
        <span>Wet</span>
      </div>
    </div>
  );
}

function SoilStateMessage({ error }: { error: string | null }) {
  return (
    <p className="m-0 text-[13.5px] text-muted">
      {error
        ? error === "not configured"
          ? "The field sensor is not connected yet."
          : "The field sensor could not be reached right now."
        : "Reading the field sensor…"}
    </p>
  );
}

/** Compact card for the Overview: today's moisture at each depth. */
export function SoilProbeCard() {
  const { probe, latest, error } = useLatestSoil();
  return (
    <Panel className="flex h-full flex-col gap-5 px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Soil moisture</span>
          <span className="text-[13px] text-muted">
            {probe && latest ? `Field sensor · ${probe.field ?? probe.code} · ${fmtTime(latest.time)}` : "Field sensor"}
          </span>
        </div>
        <Link
          href="/app/sensors"
          className="flex items-center gap-1 whitespace-nowrap text-[13px] text-accent no-underline hover:underline"
        >
          Details <Icon name="arrow" size={14} />
        </Link>
      </div>
      {probe && latest ? <DepthRows probe={probe} reading={latest} /> : <SoilStateMessage error={error} />}
    </Panel>
  );
}

/* ── Sensors page panel ──────────────────────────────────────────────── */

function DepthTile({ label, color, value }: { label: string; color: string; value: number | null }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[12px] border border-divider px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] text-muted">
          <span className="size-2.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
        {value != null && <LevelPill level={moistureLevel(value)} />}
      </div>
      <span className="text-[28px] font-semibold leading-none tabular-nums">{pct(value)}</span>
      <LevelBar pct={value} className="h-2" />
    </div>
  );
}

/** Full panel for the Sensors page: a tile per depth, the history chart, and every reading on demand. */
export function SoilProbePanel() {
  const { data, error } = useSoil();
  const { latest } = useLatestSoil();
  const [showAll, setShowAll] = React.useState(false);

  if (!data || !latest) {
    return (
      <Panel className="px-5 py-5">
        <span className="text-lg font-semibold">Field sensor</span>
        <div className="mt-2">
          {data && !latest ? (
            <p className="m-0 text-[13.5px] text-muted">The sensor has not sent a reading from the soil yet.</p>
          ) : (
            <SoilStateMessage error={error} />
          )}
        </div>
      </Panel>
    );
  }

  const { probe } = data;
  const soilRows = probe.readings.filter(inSoil);

  return (
    <Panel className="flex flex-col gap-5 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Field sensor &middot; {probe.field ?? probe.code}</span>
          <span className="text-[13px] text-muted">Last reading {fmtTime(latest.time)}</span>
        </div>
        <LevelPill level={moistureLevel(rootZone(latest))} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {DEPTHS.map((d, i) => (
          <DepthTile key={d.key} label={`${probe.depths[i]} cm deep`} color={d.color} value={latest[d.key]} />
        ))}
        <div className="flex flex-col gap-2.5 rounded-[12px] border border-divider px-4 py-3.5">
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <Icon name="thermo" size={15} strokeWidth={1.8} />
            Soil temperature
          </span>
          <span className="text-[28px] font-semibold leading-none tabular-nums">
            {latest.soilTemp == null ? "—" : `${latest.soilTemp.toFixed(1)}°C`}
          </span>
          <span className="text-[12px] text-muted">At the sensor</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-divider pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-[15px] font-semibold">Moisture at each reading</span>
          <span className="flex flex-wrap gap-3.5 text-[12.5px] text-muted">
            {DEPTHS.map((d, i) => (
              <span key={d.key} className="flex items-center gap-1.5">
                <span className="h-[3px] w-4 rounded-full" style={{ background: d.color }} />
                {probe.depths[i]} cm
              </span>
            ))}
          </span>
        </div>
        <MoistureChart rows={soilRows} depths={probe.depths} />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex w-fit items-center gap-1.5 text-[13px] text-accent hover:underline"
        >
          <Icon name={showAll ? "up" : "down"} size={14} />
          {showAll ? "Hide readings" : `Show all ${probe.readings.length} readings`}
        </button>
        {showAll && <ReadingsTable rows={probe.readings} depths={probe.depths} />}
      </div>
    </Panel>
  );
}

/* ── Chart ───────────────────────────────────────────────────────────── */

/**
 * Drawn in real pixels at a fixed height. The y-axis is zoomed to the
 * readings (rounded out to 10 %) because the probe mostly sits in a narrow
 * band, and on a 0–100 axis a 10-point change between depths is a hairline.
 * Readings are evenly spaced, one per step, each labelled with its date: the
 * probe reports irregularly and a time axis would crush them into a corner.
 */
function MoistureChart({ rows, depths }: { rows: SoilReading[]; depths: [number, number, number] }) {
  const [ref, w] = useElementWidth<HTMLDivElement>();
  const h = 250;
  const left = 40;
  const right = 96; // room for the end labels
  const top = 14;
  const bottom = h - 42;
  const span = w - left - right;

  const values = rows.flatMap((r) => DEPTHS.map((d) => r[d.key]!));
  const lo = Math.max(0, Math.floor((Math.min(...values) - 5) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...values) + 2) / 10) * 10);
  const step = hi - lo > 40 ? 20 : hi - lo > 20 ? 10 : 5;
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);

  const x = (i: number) => left + (rows.length === 1 ? span / 2 : (i / (rows.length - 1)) * span);
  const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);

  // Hover slots are centred on each point.
  const slot = rows.length > 1 ? span / (rows.length - 1) : span;
  const hover = useBarHover(rows.length, left - slot / 2, right - slot / 2, w);
  const hi_ = hover.index;
  const at = hi_ == null ? null : rows[hi_];

  // Label every point's date unless they would collide; then thin evenly.
  const every = Math.max(1, Math.ceil(90 / Math.max(1, slot)));

  // End labels, nudged apart so close values don't overprint.
  const last = rows[rows.length - 1];
  const ends = DEPTHS.map((d, i) => ({ d, i, y: y(last[d.key]!) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 16);

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      {at && (
        <div
          className="pointer-events-none absolute z-10 flex flex-col gap-1 rounded-[8px] border border-panel-border bg-s2 px-3 py-2 text-[12.5px] shadow-pop"
          style={{
            top: 4,
            left: x(hi_!),
            transform: `translateX(${x(hi_!) > w - 200 ? "calc(-100% - 12px)" : "12px"})`,
          }}
        >
          <span className="font-semibold">{fmtTime(at.time)}</span>
          {DEPTHS.map((d, i) => (
            <span key={d.key} className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: d.color }} />
              <span className="text-muted">{depths[i]} cm</span>
              <span className="ml-auto pl-4 font-semibold tabular-nums">{pct(at[d.key])}</span>
            </span>
          ))}
        </div>
      )}
      <svg width={w} height={h} className="block">
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
          {ticks.map((v) => (
            <line key={v} x1={left} x2={w - right + 8} y1={y(v)} y2={y(v)} />
          ))}
        </g>
        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          {ticks.map((v) => (
            <text key={v} x={left - 8} y={y(v) + 4} textAnchor="end">
              {v}%
            </text>
          ))}
        </g>

        <HoverGuide hover={hover} left={left - slot / 2} right={right - slot / 2} width={w} top={top} bottom={bottom} />

        {DEPTHS.map((d) => (
          <g key={d.key}>
            <path
              d={rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r[d.key]!).toFixed(1)}`).join("")}
              fill="none"
              stroke={d.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {rows.map((r, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(r[d.key]!)}
                r={hi_ === i ? 5.5 : 4}
                fill={d.color}
                stroke="var(--ap-surface)"
                strokeWidth={2}
              />
            ))}
          </g>
        ))}

        {/* Latest value at the end of each line. */}
        <g fontSize={12.5}>
          {ends.map(({ d, i, y: ly }) => (
            <text key={d.key} x={w - right + 14} y={ly + 4} style={{ fill: "var(--ap-text)" }}>
              <tspan style={{ fill: "var(--ap-muted)" }}>{depths[i]} cm </tspan>
              <tspan fontWeight={600}>{pct(last[d.key])}</tspan>
            </text>
          ))}
        </g>

        {/* One date per reading, thinned only if they would collide. */}
        <g style={{ fill: "var(--ap-muted)" }} fontSize={11.5} textAnchor="middle">
          {rows.map((r, i) =>
            i % every === 0 || i === rows.length - 1 ? (
              <text key={i} x={x(i)} y={bottom + 22}>
                <tspan x={x(i)}>{fmtDay(r.time)}</tspan>
                <tspan x={x(i)} dy={14} style={{ fill: "var(--ap-faint)" }}>
                  {fmtClock(r.time)}
                </tspan>
              </text>
            ) : null,
          )}
        </g>
      </svg>
    </div>
  );
}

function ReadingsTable({ rows, depths }: { rows: SoilReading[]; depths: [number, number, number] }) {
  return (
    <div className="max-h-[300px] overflow-auto rounded-[10px] border border-divider">
      <table className="w-full min-w-[520px] border-collapse text-[13px]">
        <thead className="sticky top-0 bg-[var(--ap-surface)]">
          <tr className="text-[12px] text-muted">
            {["When", `${depths[0]} cm`, `${depths[1]} cm`, `${depths[2]} cm`, "Soil temp."].map((h, i) => (
              <th
                key={h}
                className={`border-b border-divider py-2.5 font-normal ${i === 0 ? "px-3 text-left" : "pr-3 text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rows].reverse().map((r) => (
            <tr key={r.time} className={inSoil(r) ? "" : "text-faint"}>
              <td className="border-b border-divider px-3 py-2">
                {fmtTime(r.time)}
                {!inSoil(r) && <span className="ml-2 text-[11.5px]">(sensor not in soil)</span>}
              </td>
              <td className="border-b border-divider pr-3 text-right tabular-nums">{pct(r.m20)}</td>
              <td className="border-b border-divider pr-3 text-right tabular-nums">{pct(r.m40)}</td>
              <td className="border-b border-divider pr-3 text-right tabular-nums">{pct(r.m60)}</td>
              <td className="border-b border-divider pr-3 text-right tabular-nums">
                {r.soilTemp == null ? "—" : `${r.soilTemp.toFixed(1)} °C`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
