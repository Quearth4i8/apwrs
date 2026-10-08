"use client";

import * as React from "react";
import { Panel } from "@/components/ui/primitives";
import { HoverGuide, HoverReadout, useBarHover, useElementWidth } from "@/components/ui/chart-hover";
import { BASIN, monthLabel } from "@/lib/basin";

/**
 * The Overview's water card for the Ichkeul catchment: this year's rain by
 * month against the 1991–2020 normal. Everything is
 * the area-weighted ERA5-Land figure over the catchment's sections.
 */

const RAIN = "#2F7FD1";
const last = BASIN.months.length - 1;

export function BasinWaterCard() {
  // This year only: January to the latest month the basin data reaches.
  const year = BASIN.months[last].slice(0, 4);
  const from = Math.max(0, BASIN.months.findIndex((m) => m.startsWith(year)));

  return (
    <Panel className="flex flex-col gap-5 px-5 py-5">
      <span className="text-lg font-semibold">Study area</span>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="font-semibold">Rain in {year}</span>
          <span className="flex items-center gap-3 text-[12px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: RAIN }} />
              Rain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: "var(--ap-muted)" }} />
              Normal
            </span>
          </span>
        </div>
        <RainBars from={from} />
      </div>
    </Panel>
  );
}

/** This year's catchment rain by month as bars, the normal as a dash on each. */
function RainBars({ from }: { from: number }) {
  const months = BASIN.months.slice(from);
  const rain = BASIN.rain.slice(from);
  const normal = BASIN.rainNormal.slice(from);

  const [ref, w] = useElementWidth<HTMLDivElement>(420);
  const h = 150;
  const padL = 30;
  const padR = 4;
  const padT = 8;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const top = Math.max(...rain.map((v) => v ?? 0), ...normal.map((v) => v ?? 0), 1);
  const step = niceStep(top);
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const slot = innerW / months.length;
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const hover = useBarHover(months.length, padL, padR, w);
  const at = hover.index;

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={padL} right={padR} width={w}>
        {at != null && (
          <>
            {monthLabel(months[at])} &middot; {rain[at] == null ? "—" : `${Math.round(rain[at]!)} mm`}
            {normal[at] != null && <span className="text-muted"> (normal {Math.round(normal[at]!)})</span>}
          </>
        )}
      </HoverReadout>
      <svg width={w} height={h} className="block">
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
          {ticks.map((t) => (
            <line key={t} x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <HoverGuide hover={hover} left={padL} right={padR} width={w} top={padT} bottom={padT + innerH} />
        {months.map((m, i) => {
          const v = rain[i];
          const n = normal[i];
          const bw = Math.min(22, slot * 0.6);
          const x0 = padL + i * slot + (slot - bw) / 2;
          return (
            <g key={m}>
              {v != null && (
                <rect
                  x={x0}
                  y={y(v)}
                  width={bw}
                  height={Math.max(1, padT + innerH - y(v))}
                  rx={Math.min(4, bw / 3)}
                  fill={RAIN}
                  fillOpacity={at == null || at === i ? 0.9 : 0.45}
                />
              )}
              {n != null && (
                <line
                  x1={x0 - 3}
                  x2={x0 + bw + 3}
                  y1={y(n)}
                  y2={y(n)}
                  style={{ stroke: "var(--ap-text)", strokeOpacity: 0.55 }}
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
              )}
            </g>
          );
        })}
        <g style={{ fill: "var(--ap-muted)" }} fontSize={11}>
          {ticks.map((t) => (
            <text key={t} x={padL - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          ))}
          {months.map((m, i) => (
            <text key={m} x={padL + i * slot + slot / 2} y={h - 6} textAnchor="middle">
              {monthLabel(m, true)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

/** 1, 2 or 5 × 10ⁿ, for about three gridlines. */
function niceStep(max: number) {
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? 10 * mag;
}
