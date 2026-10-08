"use client";

import * as React from "react";
import { Reveal } from "@/components/ui/reveal";
import { Icon } from "@/components/icon";
import { Panel } from "@/components/ui/primitives";
import { useBarHover, HoverReadout, HoverGuide, useElementWidth } from "@/components/ui/chart-hover";
import { SoilProbePanel } from "@/components/soil-probe";
import { STATIONS, type Station } from "@/lib/climate";

/**
 * The one live instrument — the SmartFarm soil probe — comes first. The two
 * weather stations are archives: position and a 30-year record, no live
 * telemetry, so they show what they hold and nothing about battery or link.
 */
export function PageSensors() {
  const [selected, setSelected] = React.useState<Station>(STATIONS[0]);

  return (
    <Reveal className="flex min-h-full flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[clamp(28px,4vw,36px)] leading-none tracking-[-0.02em]">Sensors</h1>
      </div>

      <SoilProbePanel />

      <Panel className="flex flex-col gap-5 px-5 py-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Weather stations</span>
          <span className="text-[13px] text-muted">Pick a station to see its daily rain.</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {STATIONS.map((s) => {
            const meanRain = s.annual.reduce((a, y) => a + y.precip, 0) / s.annual.length;
            const active = s.id === selected.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                aria-pressed={active}
                className={`flex items-center gap-4 rounded-[12px] border px-4 py-3.5 text-left transition-colors ${
                  active ? "border-accent bg-accent-100" : "border-divider hover:bg-neutral-100"
                }`}
              >
                <span
                  className="grid size-10 flex-none place-items-center rounded-[10px]"
                  style={{
                    color: "var(--ap-accent)",
                    background: "color-mix(in srgb, var(--ap-accent) 14%, transparent)",
                  }}
                >
                  <Icon name="cloudsun" size={20} strokeWidth={1.8} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-semibold">{s.name}</span>
                  <span className="text-[13px] text-muted">
                    Weather from {s.coverage.from.slice(0, 4)} to {s.coverage.to.slice(0, 4)}
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="text-[15px] font-semibold tabular-nums">{meanRain.toFixed(0)} mm</span>
                  <span className="text-[12px] text-muted">rain per year</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 border-t border-divider pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-[15px] font-semibold">Daily rain at {selected.name}</span>
            <span className="text-[12.5px] text-muted">
              Last 90 days of the record, to {fmtDay(selected.recent[selected.recent.length - 1].date)}
            </span>
          </div>
          <RecentRain station={selected} />
        </div>
      </Panel>
    </Reveal>
  );
}

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function RecentRain({ station }: { station: Station }) {
  const rows = station.recent.slice(-90);
  const max = Math.max(...rows.map((r) => r.precip), 5);
  const [ref, w] = useElementWidth<HTMLDivElement>();
  const h = 200;
  const bw = w / rows.length;

  const hover = useBarHover(rows.length, 0, 0, w);
  const at = hover.index == null ? null : rows[hover.index];

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={0} right={0} width={w}>
        {at && (
          <>
            {fmtDay(at.date)} &middot; {at.precip.toFixed(1)} mm
          </>
        )}
      </HoverReadout>
      <svg width={w} height={h} className="block">
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
          <line x1={0} x2={w} y1={h - 22} y2={h - 22} />
          <line x1={0} x2={w} y1={(h - 22) / 2} y2={(h - 22) / 2} />
        </g>
        {rows.map((r, i) => {
          const bh = (r.precip / max) * (h - 34);
          return (
            <rect
              key={r.date}
              x={i * bw}
              y={h - 22 - bh}
              width={Math.max(1, bw - 1)}
              height={bh}
              rx={1.5}
              fill="var(--ap-accent)"
              fillOpacity={hover.index === i ? 1 : 0.8}
            />
          );
        })}
        <HoverGuide hover={hover} left={0} right={0} width={w} top={0} bottom={h - 22} />
        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          <text x={2} y={12}>
            {max.toFixed(0)} mm
          </text>
          <text x={2} y={h - 5}>
            {fmtDay(rows[0].date)}
          </text>
          <text x={w - 2} y={h - 5} textAnchor="end">
            {fmtDay(rows[rows.length - 1].date)}
          </text>
        </g>
      </svg>
    </div>
  );
}
