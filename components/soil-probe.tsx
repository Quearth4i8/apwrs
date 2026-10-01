"use client";

import * as React from "react";
import { Panel, Stat } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { useBarHover, HoverReadout, HoverGuide } from "@/components/ui/chart-hover";
import { useSoil } from "@/lib/use-soil";
import type { SoilReading } from "@/lib/smartfarm";

/** Shallow to deep reads light to dark, so depth is legible without the legend. */
const DEPTHS = [
  { key: "m20", color: "var(--ap-accent-600)" },
  { key: "m40", color: "var(--ap-accent)" },
  { key: "m60", color: "var(--ap-accent-700)" },
] as const;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  });

const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)} %`);

/**
 * Live readings from the SmartFarm soil probe. Unlike the archive stations
 * above, this one is in the ground and reporting, so it shows the latest
 * value per depth and every reading it has sent.
 */
export function SoilProbePanel() {
  const { data, error } = useSoil();

  if (error) {
    return (
      <NoData
        icon="radio"
        title="Soil probe unavailable"
        what={
          error === "not configured"
            ? "The SmartFarm credentials are not set on the server, so the probe cannot be read."
            : `SmartFarm did not answer: ${error}.`
        }
        needs="SMARTFARM_* in .env.local"
      />
    );
  }

  if (!data) {
    return (
      <Panel className="px-5 py-10 text-center font-mono text-[11px] tracking-[0.08em] text-muted">
        READING SOIL PROBE&hellip;
      </Panel>
    );
  }

  const { probe } = data;
  const rows = probe.readings;
  const latest = [...rows].reverse().find((r) => r.m20 != null || r.m40 != null || r.m60 != null);

  return (
    <Panel className="flex flex-col gap-4 px-5 py-4.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
            SOIL PROBE &middot; {probe.code}
          </span>
          <span className="font-heading text-lg font-semibold">
            Soil moisture at {probe.depths.join(", ")} cm
          </span>
        </div>
        <span className="font-mono text-[10.5px] text-muted">
          {probe.field ?? "SmartFarm"}
          {probe.lat != null && probe.lon != null && (
            <>
              {" "}
              &middot; {probe.lat.toFixed(3)}&deg;N {probe.lon.toFixed(3)}&deg;E
            </>
          )}
          {probe.status && <> &middot; {probe.status.toUpperCase()}</>}
        </span>
      </div>

      {latest ? (
        <>
          <div className="grid grid-cols-2 border-l border-t border-divider sm:grid-cols-4">
            {DEPTHS.map((d, i) => (
              <Stat
                key={d.key}
                className="border-b border-r border-divider"
                label={
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 flex-none" style={{ background: d.color }} />
                    MOISTURE @{probe.depths[i]} cm
                  </span>
                }
                value={pct(latest[d.key])}
              />
            ))}
            <Stat
              className="border-b border-r border-divider"
              label="SOIL TEMPERATURE"
              value={latest.soilTemp == null ? "—" : `${latest.soilTemp.toFixed(1)} °C`}
            />
          </div>
          <span className="-mt-2 font-mono text-[10.5px] text-muted">
            LAST READING {fmtTime(latest.time).toUpperCase()}
          </span>
          <MoistureChart rows={rows} depths={probe.depths} />
          <ReadingsTable rows={rows} depths={probe.depths} />
        </>
      ) : (
        <p className="m-0 text-[13.5px] text-muted">
          The probe has not sent a usable reading in the last {data.days} days.
        </p>
      )}

      <Provenance>
        {data.source} &middot; {rows.length} readings in {data.days} days &middot; &ldquo;—&rdquo; marks a channel
        reading open-circuit (probe not in soil)
      </Provenance>
    </Panel>
  );
}

function MoistureChart({ rows, depths }: { rows: SoilReading[]; depths: [number, number, number] }) {
  const w = 720;
  const h = 190;
  const left = 30;
  const right = 8;
  const top = 10;
  const bottom = h - 22;
  const span = w - left - right;
  // One even step per reading: the probe reports irregularly, and a time
  // axis would crush the recent readings into a corner.
  const x = (i: number) => left + ((i + 0.5) / rows.length) * span;
  const y = (v: number) => bottom - (v / 100) * (bottom - top);

  const hover = useBarHover(rows.length, left, right, w);
  const at = hover.index == null ? null : rows[hover.index];

  return (
    <div className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={left} right={right} width={w}>
        {at && (
          <>
            {fmtTime(at.time)} &middot; {depths[0]} cm {pct(at.m20)} &middot; {depths[1]} cm {pct(at.m40)} &middot;{" "}
            {depths[2]} cm {pct(at.m60)}
          </>
        )}
      </HoverReadout>
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
          {[0, 50, 100].map((v) => (
            <line key={v} x1={left} x2={w - right} y1={y(v)} y2={y(v)} />
          ))}
        </g>
        {DEPTHS.map((d) => {
          // Break the line at missing values rather than bridging them.
          const segs: string[] = [];
          let cur = "";
          rows.forEach((r, i) => {
            const v = r[d.key];
            if (v == null) {
              if (cur) segs.push(cur);
              cur = "";
            } else cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
          });
          if (cur) segs.push(cur);
          return (
            <g key={d.key}>
              {segs.map((s) => (
                <path key={s} d={s} fill="none" stroke={d.color} strokeWidth={2} />
              ))}
              {rows.map((r, i) =>
                r[d.key] == null ? null : (
                  <circle key={i} cx={x(i)} cy={y(r[d.key]!)} r={hover.index === i ? 4 : 2.5} fill={d.color} />
                ),
              )}
            </g>
          );
        })}
        <HoverGuide hover={hover} left={left} right={right} width={w} top={top} bottom={bottom} />
        <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
          {[0, 50, 100].map((v) => (
            <text key={v} x={left - 4} y={y(v) + 3} textAnchor="end">
              {v}%
            </text>
          ))}
          {rows.length > 0 && (
            <>
              <text x={left} y={h - 6}>
                {rows[0].time.slice(0, 10)}
              </text>
              <text x={w - right} y={h - 6} textAnchor="end">
                {rows[rows.length - 1].time.slice(0, 10)}
              </text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

function ReadingsTable({ rows, depths }: { rows: SoilReading[]; depths: [number, number, number] }) {
  return (
    <div className="max-h-[280px] overflow-auto border border-divider">
      <table className="w-full min-w-[560px] border-collapse text-[13px]">
        <thead className="sticky top-0 bg-panel">
          <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
            {["Time", `${depths[0]} cm`, `${depths[1]} cm`, `${depths[2]} cm`, "Soil temp"].map((h, i) => (
              <th
                key={h}
                className={`border-b border-divider py-2.5 font-normal uppercase ${
                  i === 0 ? "px-3 text-left" : "pr-3 text-right"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rows].reverse().map((r) => (
            <tr key={r.time}>
              <td className="border-b border-divider px-3 py-2 font-mono text-[11.5px]">{fmtTime(r.time)}</td>
              <td className="border-b border-divider pr-3 text-right font-mono">{pct(r.m20)}</td>
              <td className="border-b border-divider pr-3 text-right font-mono">{pct(r.m40)}</td>
              <td className="border-b border-divider pr-3 text-right font-mono">{pct(r.m60)}</td>
              <td className="border-b border-divider pr-3 text-right font-mono">
                {r.soilTemp == null ? "—" : `${r.soilTemp.toFixed(1)} °C`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
