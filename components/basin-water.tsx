"use client";

import * as React from "react";
import { Panel } from "@/components/ui/primitives";
import { HoverGuide, HoverReadout, useBarHover, useElementWidth } from "@/components/ui/chart-hover";
import { BASIN, WATER_CLASSES, monthLabel, waterClass } from "@/lib/basin";

/**
 * The Overview's water card for the Ichkeul catchment: this month's rain and
 * the water held in the root zone, a year of rain against the 1991–2020
 * normal, and how wet each soil layer is for the time of year. Everything is
 * the area-weighted ERA5-Land figure over the catchment's sections.
 */

const RAIN = "#2F7FD1";
const last = BASIN.months.length - 1;

export function BasinWaterCard() {
  const month = BASIN.months[last];
  const rain = BASIN.rain[last];
  const rainNormal = BASIN.rainNormal[last];
  const reserve = BASIN.reserveMm[last];
  const reserveNormal = BASIN.reserveNormalMm[last];
  const reserveClass = waterClass(BASIN.reservePct[last]);

  const from = Math.max(0, last - 11);
  const year = sum(BASIN.rain.slice(from));
  const yearNormal = sum(BASIN.rainNormal.slice(from));
  const yearDiff = yearNormal ? Math.round(((year - yearNormal) / yearNormal) * 100) : null;

  return (
    <Panel className="flex h-full flex-col gap-5 px-5 py-5">
      <span className="text-lg font-semibold">Study area</span>

      <div className="grid grid-cols-3 gap-2.5">
        <Figure
          label={`Rain · ${monthLabel(month, true)}`}
          value={rain == null ? "—" : Math.round(rain)}
          unit="mm"
          note={rainNormal == null ? undefined : `Normal ${Math.round(rainNormal)} mm`}
        />
        <Figure
          label="Water reserve"
          value={reserve == null ? "—" : Math.round(reserve)}
          unit="mm"
          note={
            reserveClass ? (
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: reserveClass.color }} />
                {reserveClass.label}
                {reserveNormal != null && <span className="text-faint">· {Math.round(reserveNormal)}</span>}
              </span>
            ) : undefined
          }
        />
        <Figure
          label="Rain · 12 months"
          value={Math.round(year)}
          unit="mm"
          note={
            yearDiff == null ? undefined : (
              <span style={{ color: yearDiff < 0 ? "#EE8434" : RAIN }}>
                {yearDiff > 0 ? "+" : ""}
                {yearDiff}% vs normal
              </span>
            )
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="font-semibold">Rain, last 12 months</span>
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="font-semibold">Soil water by depth</span>
          <span className="text-[12px] text-muted">vs the same month, 1991–2020</span>
        </div>
        {BASIN.layers.map((l) => (
          <DepthRow key={l.key} label={l.label} pct={l.pct[last]} />
        ))}
        <div className="ml-[84px] mr-[92px] flex justify-between text-[11.5px] text-faint">
          <span>Drier</span>
          <span>Normal</span>
          <span>Wetter</span>
        </div>
      </div>
    </Panel>
  );
}

function Figure({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: React.ReactNode;
  unit: string;
  note?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[12px] bg-neutral-100 px-3 py-2.5">
      <span className="truncate text-[12px] text-muted">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none tabular-nums">{value}</span>
        <span className="text-[12px] text-muted">{unit}</span>
      </span>
      {note && <span className="truncate text-[11.5px] text-muted">{note}</span>}
    </div>
  );
}

/** Twelve months of catchment rain as bars, the normal as a dash on each. */
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
              {monthLabel(m, true).charAt(0)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

/** A layer's percentile on a dry-to-wet track, with its class. */
function DepthRow({ label, pct }: { label: string; pct: number | null }) {
  const cls = waterClass(pct);
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)_80px] items-center gap-3 text-[13px]">
      <span className="text-muted">{label}</span>
      <div className="relative h-2 rounded-full">
        <div
          className="absolute inset-0 rounded-full opacity-80"
          style={{
            background: `linear-gradient(to right, ${WATER_CLASSES.map((c, i) => `${c.color} ${[5, 20, 50, 80, 95][i]}%`).join(", ")})`,
          }}
        />
        {pct != null && (
          <span
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-[var(--ap-surface)] shadow"
            style={{ left: `${Math.min(98, Math.max(2, pct))}%`, background: "var(--ap-text)" }}
          />
        )}
      </div>
      <span className="flex items-center justify-end gap-1.5 whitespace-nowrap text-[12.5px] font-medium">
        {cls ? (
          <>
            <span className="size-2 rounded-full" style={{ background: cls.color }} />
            {cls.label}
          </>
        ) : (
          <span className="text-faint">—</span>
        )}
      </span>
    </div>
  );
}

function sum(xs: (number | null)[]) {
  return xs.reduce<number>((s, v) => s + (v ?? 0), 0);
}

/** 1, 2 or 5 × 10ⁿ, for about three gridlines. */
function niceStep(max: number) {
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? 10 * mag;
}
