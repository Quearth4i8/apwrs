"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Menu, MenuItem, MenuTrigger } from "@/components/ui/dropdown";
import { Blueprint, PageHeader, RiskBadge, TabStrip } from "@/components/ui/primitives";
import { ARCHIVE_SEASONS, YEAR_SCORES } from "@/lib/data";
import { riskColor } from "@/lib/utils";

const Yv = (v: number) => 220 - v * 2.5;
const MON = ["S", "O", "N", "D", "J", "F", "M", "A", "M", "J", "J", "A"];
const mx = (i: number) => 40 + i * (500 / 11);

/** A plausible within-season shape for a year, anchored on its peak score. */
function curve(year: string) {
  const s = YEAR_SCORES.find((a) => a[0] === +year)?.[1] ?? 50;
  return MON.map((_, i) => {
    const seasonal = Math.cos(((i - 1) / 12) * Math.PI * 2) * -18;
    return Math.max(5, Math.min(95, s - 8 + seasonal * 0.8 + (i < 3 ? 8 - i * 4 : 0) + 6 * Math.sin(i * 1.3 + +year)));
  });
}

const path = (a: number[]) => "M" + a.map((v, i) => `${mx(i).toFixed(1)} ${(220 - v * 2).toFixed(1)}`).join("L");

export function PageHistory({ tab: initial }: { tab: "compare" | "archive" }) {
  const { site } = useConsole();
  const [tab, setTab] = React.useState(initial);
  const [ya, setYa] = React.useState("2026");
  const [yb, setYb] = React.useState("2022");

  const ca = curve(ya);
  const cb = curve(yb);
  const stat = (c: number[], y: string) => ({
    peak: Math.round(Math.max(...c)),
    rain: Math.round(620 - (YEAR_SCORES.find((a) => a[0] === +y)?.[1] ?? 50) * 4.6),
    days: c.filter((v) => v >= 50).length * 30,
  });
  const sa = stat(ca, ya);
  const sb = stat(cb, yb);
  const years = YEAR_SCORES.map((a) => String(a[0])).reverse();

  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={
          <>
            HISTORY &middot; {site.cc} / {site.name} &middot; REFERENCE 2016&ndash;2026 &middot; ERA5-LAND 1981&ndash;
          </>
        }
        title={tab === "compare" ? "Historical comparison" : "Seasonal archive"}
        actions={
          <Menu
            align="end"
            className="w-[220px]"
            trigger={
              <MenuTrigger className="h-9">
                <Icon name="download" size={15} />
                Export
                <Icon name="down" size={14} />
              </MenuTrigger>
            }
          >
            {(
              [
                ["Data table", "CSV"],
                ["Spreadsheet", "XLSX"],
                ["Report with charts", "PDF"],
                ["Chart image", "PNG"],
              ] as const
            ).map(([l, f]) => (
              <MenuItem key={f} hint={f}>
                {l}
              </MenuItem>
            ))}
          </Menu>
        }
      />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "compare", label: "Historical comparison" },
          { value: "archive", label: "Seasonal archive" },
        ]}
      />

      {tab === "compare" ? (
        <>
          <Blueprint className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                ["CURRENT · 23 SEP 2026", "58", <RiskBadge key="b" level="severe" />],
                ["10-YEAR MEAN · SEPTEMBER", "42", <span key="b" className="font-mono text-xs text-severe">+16 above</span>],
                ["PERCENTILE · 1981–2026", "P84", <span key="b" className="font-mono text-xs text-muted">of 46 Septembers</span>],
                ["RETURN FREQUENCY", "1 in 6", <span key="b" className="font-mono text-xs text-muted">years · score ≥ 58</span>],
              ] as const
            ).map(([k, v, extra], i) => (
              <div
                key={k}
                className={`flex flex-col gap-2 border-b border-divider px-5 py-4.5 xl:border-b-0 ${
                  i < 3 ? "xl:border-r" : ""
                }`}
              >
                <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">{k}</span>
                <span className="flex flex-wrap items-baseline gap-2.5">
                  <span className="font-heading text-[44px] font-semibold leading-none tabular-nums">{v}</span>
                  {extra}
                </span>
              </div>
            ))}
          </Blueprint>

          <Blueprint className="flex flex-col gap-3 px-5 py-4.5">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-heading text-[17px] font-semibold">Percentile tiers</span>
              <span className="font-mono text-[10.5px] text-muted">SEPTEMBER RISK SCORE DISTRIBUTION</span>
            </div>
            <div className="relative pt-5.5">
              <div className="absolute left-[84%] top-0 -translate-x-1/2 bg-ink px-1.5 py-px font-mono text-[10px] text-bg">
                2026 &middot; P84
              </div>
              <div className="absolute -bottom-1 left-[84%] top-4.5 w-0.5 bg-ink" />
              <div className="grid h-[34px] grid-cols-[25fr_25fr_25fr_15fr_10fr] gap-0.5">
                {(
                  [
                    ["P0–25 · WET", "rgb(56 168 138 / 0.18)", "rgb(56 168 138 / 0.4)", "#38A88A"],
                    ["P25–50 · NORMAL", "rgb(56 168 138 / 0.08)", "rgb(56 168 138 / 0.25)", "var(--ap-muted)"],
                    ["P50–75 · DRY", "rgb(231 168 59 / 0.1)", "rgb(231 168 59 / 0.35)", "#E7A83B"],
                    ["P75–90 · V. DRY", "rgb(238 132 52 / 0.14)", "rgb(238 132 52 / 0.45)", "#EE8434"],
                    ["P90+", "rgb(217 101 101 / 0.14)", "rgb(217 101 101 / 0.5)", "#E07B7B"],
                  ] as const
                ).map(([l, bg, bd, ink]) => (
                  <div
                    key={l}
                    className="flex items-center overflow-hidden px-2.5 font-mono text-[10.5px]"
                    style={{ background: bg, border: `1px solid ${bd}`, color: ink }}
                  >
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </Blueprint>

          <div className="grid gap-6 xl:grid-cols-2">
            <Blueprint className="flex flex-col gap-3 px-5 py-4.5">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-heading text-[17px] font-semibold">Annual trend &middot; September score</span>
                <span className="font-mono text-[10.5px] text-muted">TREND +1.6 / YR</span>
              </div>
              <svg viewBox="0 0 560 250" className="block w-full">
                <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
                  <path d="M30 20H550M30 70H550M30 120H550M30 170H550M30 220H550" />
                </g>
                {YEAR_SCORES.map(([y, v], i) => {
                  const cur = y === 2026;
                  return (
                    <g key={y}>
                      <rect
                        x={44 + i * 46}
                        y={Yv(v)}
                        width={30}
                        height={v * 2.5}
                        fill={riskColor(v)}
                        fillOpacity={cur ? 0.95 : 0.35}
                        stroke={cur ? "var(--ap-text)" : "none"}
                        strokeWidth={cur ? 1.5 : 0}
                      />
                      <text
                        x={59 + i * 46}
                        y={Yv(v) - 6}
                        textAnchor="middle"
                        style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-text)" }}
                        fontSize={10}
                        fillOpacity={cur ? 1 : 0.6}
                      >
                        {v}
                      </text>
                      <text
                        x={59 + i * 46}
                        y={238}
                        textAnchor="middle"
                        style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }}
                        fontSize={9.5}
                      >
                        &lsquo;{String(y).slice(2)}
                      </text>
                    </g>
                  );
                })}
                <line
                  x1={44}
                  y1={Yv(36)}
                  x2={536}
                  y2={Yv(52)}
                  style={{ stroke: "var(--ap-text)", strokeOpacity: 0.5 }}
                  strokeDasharray="5 4"
                />
                <line x1={30} y1={Yv(42)} x2={550} y2={Yv(42)} style={{ stroke: "var(--ap-teal)" }} strokeOpacity={0.7} />
                <text
                  x={548}
                  y={Yv(42) - 5}
                  textAnchor="end"
                  style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-teal)" }}
                  fontSize={9}
                >
                  MEAN 42
                </text>
                <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
                  <text x={24} y={24} textAnchor="end">80</text>
                  <text x={24} y={124} textAnchor="end">40</text>
                  <text x={24} y={224} textAnchor="end">0</text>
                </g>
              </svg>
            </Blueprint>

            <Blueprint className="flex flex-col gap-3 px-5 py-4.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-heading text-[17px] font-semibold">Year vs year</span>
                <div className="flex items-center gap-2 font-mono text-[11.5px]">
                  <YearSelect value={ya} onChange={setYa} years={years} border="var(--ap-accent)" label="First year" />
                  <span className="text-muted">vs</span>
                  <YearSelect value={yb} onChange={setYb} years={years} border="var(--ap-teal)" label="Second year" />
                </div>
              </div>
              <svg viewBox="0 0 560 250" className="block w-full">
                <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
                  <path d="M30 20H550M30 70H550M30 120H550M30 170H550M30 220H550" />
                </g>
                <path d={path(ca)} fill="none" style={{ stroke: "var(--ap-accent)" }} strokeWidth={2} />
                <path d={path(cb)} fill="none" style={{ stroke: "var(--ap-teal)" }} strokeWidth={2} strokeDasharray="6 4" />
                <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
                  <text x={24} y={24} textAnchor="end">100</text>
                  <text x={24} y={124} textAnchor="end">50</text>
                  <text x={24} y={224} textAnchor="end">0</text>
                  {MON.map((l, i) => (
                    <text key={i} x={mx(i)} y={238} textAnchor="middle">
                      {l}
                    </text>
                  ))}
                </g>
              </svg>
              <div className="grid grid-cols-3 border border-divider font-mono text-[11px]">
                {(
                  [
                    ["PEAK", sa.peak, sb.peak, ""],
                    ["SEASON RAIN", sa.rain, sb.rain, " mm"],
                    ["DAYS ≥ SEVERE", sa.days, sb.days, ""],
                  ] as const
                ).map(([k, a, b, unit], i) => (
                  <div key={k} className={i < 2 ? "border-r border-divider px-3 py-2" : "px-3 py-2"}>
                    <div className="text-[10px] text-muted">{k}</div>
                    <span className="text-accent">{a}</span> / <span className="text-teal">{b}</span>
                    {unit}
                  </div>
                ))}
              </div>
            </Blueprint>
          </div>
        </>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {ARCHIVE_SEASONS.map((s) => {
            let d = "M0 " + (40 - s.peak * 0.35);
            for (let i = 1; i <= 10; i++) {
              d += `L${i * 20} ${(40 - Math.max(4, s.peak * 0.4 - Math.abs(i - 4) * 3 + 4 * Math.sin(i + s.peak)) * 0.8).toFixed(1)}`;
            }
            return (
              <Blueprint key={s.y} hoverable className="flex cursor-pointer flex-col gap-3 px-4.5 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-[22px] font-semibold">{s.y}</span>
                  <RiskBadge score={s.peak} />
                </div>
                <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="block h-10 w-full">
                  <path d={d} fill="none" stroke={riskColor(s.peak)} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="grid grid-cols-3 border-t border-divider pt-2.5 font-mono text-[11px]">
                  <div>
                    <div className="text-[9.5px] text-muted">RAIN</div>
                    {s.rain} mm
                  </div>
                  <div>
                    <div className="text-[9.5px] text-muted">WHEAT</div>
                    {s.yield.toFixed(1)} t/ha
                  </div>
                  <div>
                    <div className="text-[9.5px] text-muted">SOWN</div>
                    {s.sown}
                  </div>
                </div>
                <div className="text-[12.5px] leading-[1.45] text-muted">{s.note}</div>
              </Blueprint>
            );
          })}
        </div>
      )}
    </div>
  );
}

function YearSelect({
  value,
  onChange,
  years,
  border,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  years: string[];
  border: string;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-7 border bg-bg px-1.5 font-mono text-[11.5px] text-ink outline-none"
      style={{ borderColor: border }}
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
