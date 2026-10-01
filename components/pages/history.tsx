"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Menu, MenuItem, MenuTrigger } from "@/components/ui/dropdown";
import { Panel, PageHeader, Segmented, TabStrip } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { StatTile } from "@/components/ui/simple";
import { useBarHover, HoverReadout, HoverGuide, useElementWidth } from "@/components/ui/chart-hover";
import { STATIONS, stationForSite, type Station } from "@/lib/climate";
import { indexBand, MONTH_ABBR, rainfallPercentile } from "@/lib/metrics";

/**
 * Every figure on this page comes from the 30-year daily record: annual
 * totals, the fitted SPEI series and the 1996–2025 monthly normals.
 */

const CHART = { h: 260, padL: 44, padR: 12, padT: 14, padB: 30 };

/** Year A and year B: categorical slots 1 and 2, validated in globals.css. */
const YEAR_A = "var(--ap-depth-1)";
const YEAR_B = "var(--ap-depth-2)";

export function PageHistory({ tab: initial }: { tab: "compare" | "archive" }) {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const [tab, setTab] = React.useState(initial);
  const [metric, setMetric] = React.useState<"precip" | "balance" | "spei">("precip");

  const years = station.annual;
  const yearList = years.map((a) => a.year);
  const [yearA, setYearA] = React.useState(() => yearList[yearList.length - 1]);
  const [yearB, setYearB] = React.useState(() => {
    const driest = [...years].sort((x, y) => x.balance - y.balance)[0];
    return driest.year;
  });

  return (
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title={tab === "compare" ? "Past years" : "Year by year"}
        lede={`${station.coverage.years} years of daily weather at ${station.name}, ${station.coverage.from.slice(0, 4)} to ${station.coverage.to.slice(0, 4)}.`}
        actions={
          <Menu
            align="end"
            className="w-[200px]"
            trigger={
              <MenuTrigger className="h-9">
                <Icon name="download" size={15} />
                Export
                <Icon name="down" size={14} />
              </MenuTrigger>
            }
          >
            <MenuItem hint="CSV">Annual table</MenuItem>
            <MenuItem hint="CSV">Monthly series</MenuItem>
            <MenuItem hint="CSV">SPEI / SPI</MenuItem>
          </Menu>
        }
      />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "compare", label: "Compare years" },
          { value: "archive", label: "Every year" },
        ]}
      />

      {tab === "compare" ? (
        <Compare
          station={station}
          metric={metric}
          setMetric={setMetric}
          yearA={yearA}
          yearB={yearB}
          setYearA={setYearA}
          setYearB={setYearB}
        />
      ) : (
        <Archive station={station} />
      )}
    </div>
  );
}

/* ── Comparison ──────────────────────────────────────────────────────── */

function Compare({
  station,
  metric,
  setMetric,
  yearA,
  yearB,
  setYearA,
  setYearB,
}: {
  station: Station;
  metric: "precip" | "balance" | "spei";
  setMetric: (m: "precip" | "balance" | "spei") => void;
  yearA: number;
  yearB: number;
  setYearA: (y: number) => void;
  setYearB: (y: number) => void;
}) {
  const years = station.annual;
  const latest = years[years.length - 1];
  const meanPrecip = +(years.reduce((a, y) => a + y.precip, 0) / years.length).toFixed(0);
  const pct = rainfallPercentile(station, latest.year);
  const driest = [...years].sort((a, b) => a.balance - b.balance)[0];

  const series = years.map((y) =>
    metric === "precip" ? y.precip : metric === "balance" ? y.balance : (y.meanSpei3 ?? 0),
  );
  const min = Math.min(...series, 0);
  const max = Math.max(...series, 0);

  const monthsOf = (year: number) =>
    station.months.filter((m) => m.y === year).sort((a, b) => a.m - b.m);
  const a = monthsOf(yearA);
  const b = monthsOf(yearB);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon="rain"
          label={`Rain in ${latest.year}`}
          value={latest.precip.toFixed(0)}
          unit="mm"
          note={pct == null ? undefined : `Wetter than ${pct}% of years`}
        />
        <StatTile
          icon="bars"
          tint="#7B8FD9"
          label="Average year"
          value={meanPrecip}
          unit="mm"
          note={`${latest.year} was ${Math.abs(latest.precip - meanPrecip).toFixed(0)} mm ${latest.precip >= meanPrecip ? "above" : "below"}`}
        />
        <StatTile
          icon="sun"
          tint="#D96565"
          label="Driest year"
          value={driest.year}
          note={`${driest.precip.toFixed(0)} mm of rain`}
        />
        <StatTile
          icon="gauge"
          tint={latest.monthsInDrought > 0 ? "#E7A83B" : "#38A88A"}
          label={`Drought months in ${latest.year}`}
          value={latest.monthsInDrought}
          unit="of 12"
          note={latest.minSpei3 == null ? "Index not fitted" : `Driest point: ${indexBand(latest.minSpei3)}`}
        />
      </div>

      {/* ── Full record ───────────────────────────────────────────────── */}
      <Panel className="flex flex-col gap-3 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-[16px] font-semibold">Every year since {station.coverage.from.slice(0, 4)}</span>
            <span className="text-[13px] text-muted">
              {metric === "precip"
                ? "Total rain per year, mm"
                : metric === "balance"
                  ? "Rain minus evaporation per year, mm"
                  : "Average drought index per year"}
              {" · "}
              {latest.year} and the driest year are highlighted
            </span>
          </span>
          <Segmented
            size="sm"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "precip", label: "Rain" },
              { value: "balance", label: "Rain − evaporation" },
              { value: "spei", label: "Drought index" },
            ]}
          />
        </div>

        <YearBars
          years={years}
          series={series}
          min={min}
          max={max}
          highlight={[driest.year, latest.year]}
          unit={metric === "spei" ? "" : " mm"}
        />

        <Provenance>
          {station.name}, {station.coverage.days.toLocaleString("en-GB")} days of measured weather
          {metric === "spei" ? " · SPEI-3 fitted per calendar month" : ""}
        </Provenance>
      </Panel>

      {/* ── Year vs year ──────────────────────────────────────────────── */}
      <Panel className="flex flex-col gap-3 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-col gap-0.5">
            <span className="text-[16px] font-semibold">Compare two years</span>
            <span className="text-[13px] text-muted">Rain each month, mm</span>
          </span>
          <div className="flex items-center gap-2 text-[13px]">
            <YearSelect value={yearA} onChange={setYearA} years={years.map((y) => y.year)} color={YEAR_A} label="First year" />
            <span className="text-muted">vs</span>
            <YearSelect value={yearB} onChange={setYearB} years={years.map((y) => y.year)} color={YEAR_B} label="Second year" />
          </div>
        </div>

        <MonthlyCompare station={station} a={a} b={b} yearA={yearA} yearB={yearB} />
      </Panel>
    </>
  );
}

function MonthlyCompare({
  station,
  a,
  b,
  yearA,
  yearB,
}: {
  station: Station;
  a: { m: number; p: number; e: number }[];
  b: { m: number; p: number; e: number }[];
  yearA: number;
  yearB: number;
}) {
  const [ref, w] = useElementWidth<HTMLDivElement>(880);
  const h = 250;
  const padL = 44;
  const padB = 30;
  const innerW = w - padL - 12;
  const innerH = h - 16 - padB;
  const max = Math.max(...a.map((m) => m.p), ...b.map((m) => m.p), ...station.normals.map((n) => n.precip), 10);
  const x = (m: number) => padL + ((m - 1) / 11) * innerW;
  const y = (v: number) => 16 + innerH - (v / max) * innerH;
  const line = (rows: { m: number; p: number }[]) =>
    "M" + rows.map((r) => `${x(r.m).toFixed(1)} ${y(r.p).toFixed(1)}`).join("L");

  const totalA = a.reduce((s, m) => s + m.p, 0);
  const totalB = b.reduce((s, m) => s + m.p, 0);

  return (
    <>
      <div className="flex flex-wrap gap-4 text-[12.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-full" style={{ background: YEAR_A }} />
          {yearA}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-full" style={{ background: YEAR_B }} />
          {yearB}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: "var(--ap-muted)" }} />
          Average month
        </span>
      </div>
      <div ref={ref}>
      <svg width={w} height={h} className="block">
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={padL} x2={w - 12} y1={16 + innerH * f} y2={16 + innerH * f} />
          ))}
        </g>

        {/* 30-year normal, as the reference both years are read against. */}
        <path
          d={"M" + station.normals.map((n) => `${x(n.month).toFixed(1)} ${y(n.precip).toFixed(1)}`).join("L")}
          fill="none"
          style={{ stroke: "var(--ap-muted)" }}
          strokeWidth={1.25}
          strokeDasharray="3 3"
        />
        {[
          { rows: a, color: YEAR_A },
          { rows: b, color: YEAR_B },
        ].map(({ rows, color }, k) => (
          <g key={k}>
            <path d={line(rows)} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinejoin="round" />
            {rows.map((r) => (
              <circle key={r.m} cx={x(r.m)} cy={y(r.p)} r={3.5} style={{ fill: color, stroke: "var(--ap-surface)" }} strokeWidth={2} />
            ))}
          </g>
        ))}

        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          <text x={padL - 8} y={20} textAnchor="end">{max.toFixed(0)}</text>
          <text x={padL - 8} y={16 + innerH + 4} textAnchor="end">0</text>
          {MONTH_ABBR.map((mm, i) => (
            <text key={mm} x={x(i + 1)} y={h - 8} textAnchor="middle">
              {mm.charAt(0) + mm.slice(1).toLowerCase()}
            </text>
          ))}
        </g>
      </svg>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
          <span className="text-[12.5px] text-muted">Rain in the year</span>
          <span className="text-[16px] font-semibold tabular-nums">
            <span style={{ color: YEAR_A }}>{totalA.toFixed(0)}</span>
            <span className="font-normal text-muted"> vs </span>
            <span style={{ color: YEAR_B }}>{totalB.toFixed(0)}</span> mm
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
          <span className="text-[12.5px] text-muted">Average year</span>
          <span className="text-[16px] font-semibold tabular-nums">
            {station.normals.reduce((s, n) => s + n.precip, 0).toFixed(0)} mm
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
          <span className="text-[12.5px] text-muted">Days with rain</span>
          <span className="text-[16px] font-semibold tabular-nums">
            <span style={{ color: YEAR_A }}>{station.months.filter((m) => m.y === yearA).reduce((s, m) => s + m.rd, 0)}</span>
            <span className="font-normal text-muted"> vs </span>
            <span style={{ color: YEAR_B }}>{station.months.filter((m) => m.y === yearB).reduce((s, m) => s + m.rd, 0)}</span>
          </span>
        </div>
      </div>
    </>
  );
}

/** One bar per year, drawn at real pixel size, with a hover readout. */
function YearBars({
  years,
  series,
  min,
  max,
  highlight,
  unit,
}: {
  years: Station["annual"];
  series: number[];
  min: number;
  max: number;
  highlight: number[];
  unit: string;
}) {
  const [ref, w] = useElementWidth<HTMLDivElement>(880);
  const span = max - min || 1;
  const innerW = w - CHART.padL - CHART.padR;
  const innerH = CHART.h - CHART.padT - CHART.padB;
  const barW = innerW / years.length;
  const yOf = (v: number) => CHART.padT + innerH - ((v - min) / span) * innerH;
  const zero = yOf(0);
  const hover = useBarHover(years.length, CHART.padL, CHART.padR, w);
  const at = hover.index == null ? null : years[hover.index];
  const fmt = (v: number) => (unit ? v.toFixed(0) : v.toFixed(2));

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={CHART.padL} right={CHART.padR} width={w}>
        {at && (
          <>
            {at.year} &middot; {fmt(series[hover.index!])}
            {unit}
          </>
        )}
      </HoverReadout>
      <svg width={w} height={CHART.h} className="block">
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={CHART.padL} x2={w - CHART.padR} y1={CHART.padT + innerH * f} y2={CHART.padT + innerH * f} />
          ))}
        </g>

        {years.map((y, i) => {
          const v = series[i];
          const top = Math.min(yOf(v), zero);
          const h = Math.abs(yOf(v) - zero);
          const on = highlight.includes(y.year) || hover.index === i;
          return (
            <g key={y.year}>
              <rect
                x={CHART.padL + i * barW + Math.min(3, barW * 0.12)}
                y={top}
                width={barW - 2 * Math.min(3, barW * 0.12)}
                height={Math.max(1, h)}
                rx={Math.min(4, barW / 4)}
                fill={v < 0 ? "#D96565" : "var(--ap-accent)"}
                fillOpacity={on ? 1 : 0.45}
              />
              {(barW > 26 || i % 5 === 0) && (
                <text
                  x={CHART.padL + i * barW + barW / 2}
                  y={CHART.h - 10}
                  textAnchor="middle"
                  style={{ fill: highlight.includes(y.year) ? "var(--ap-text)" : "var(--ap-muted)" }}
                  fontSize={barW > 26 ? 11.5 : 12}
                >
                  {barW > 26 ? `'${String(y.year).slice(2)}` : y.year}
                </text>
              )}
            </g>
          );
        })}

        <HoverGuide hover={hover} left={CHART.padL} right={CHART.padR} width={w} top={CHART.padT} bottom={CHART.padT + innerH} />
        <line x1={CHART.padL} x2={w - CHART.padR} y1={zero} y2={zero} style={{ stroke: "var(--ap-text)", strokeOpacity: 0.35 }} />
        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          <text x={CHART.padL - 8} y={CHART.padT + 4} textAnchor="end">{fmt(max)}</text>
          {min < 0 && <text x={CHART.padL - 8} y={zero + 4} textAnchor="end">0</text>}
          <text x={CHART.padL - 8} y={CHART.padT + innerH + 4} textAnchor="end">{fmt(min)}</text>
        </g>
      </svg>
    </div>
  );
}

/* ── Archive ─────────────────────────────────────────────────────────── */

function Archive({ station }: { station: Station }) {
  const years = [...station.annual].reverse();
  const meanPrecip = station.annual.reduce((a, y) => a + y.precip, 0) / station.annual.length;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {years.map((y) => {
          const months = station.months.filter((m) => m.y === y.year).sort((p, q) => p.m - q.m);
          const max = Math.max(...months.map((m) => m.p), 1);
          const d =
            "M" + months.map((m, i) => `${(i * 200) / 11} ${(40 - (m.p / max) * 36).toFixed(1)}`).join("L");
          const wetter = y.precip >= meanPrecip;
          return (
            <Panel key={y.year} hoverable className="flex flex-col gap-3 px-4.5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-[22px] font-semibold">{y.year}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                  style={{
                    background: wetter ? "rgb(56 168 138 / 0.14)" : "rgb(217 101 101 / 0.14)",
                    color: wetter ? "#38A88A" : "#E07B7B",
                  }}
                >
                  {wetter ? "Wetter than usual" : "Drier than usual"}
                </span>
              </div>
              <svg viewBox="0 0 200 42" preserveAspectRatio="none" className="block h-10 w-full">
                <path d={d} fill="none" stroke={wetter ? "var(--ap-accent)" : "#D96565"} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="grid grid-cols-3 gap-2 text-[13px]">
                <div className="flex flex-col">
                  <span className="text-[12px] text-muted">Rain</span>
                  <span className="font-semibold tabular-nums">{y.precip.toFixed(0)} mm</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] text-muted">Balance</span>
                  <span className="font-semibold tabular-nums">{y.balance.toFixed(0)} mm</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] text-muted">Rain days</span>
                  <span className="font-semibold tabular-nums">{months.reduce((s, m) => s + m.rd, 0)}</span>
                </div>
              </div>
              <div className="text-[12.5px] text-muted">
                {y.minSpei3 == null ? (
                  "Drought index not fitted"
                ) : y.monthsInDrought > 0 ? (
                  <>
                    {y.monthsInDrought} drought {y.monthsInDrought === 1 ? "month" : "months"} &middot; driest point{" "}
                    {indexBand(y.minSpei3)}
                  </>
                ) : (
                  "No drought months"
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      <Provenance>
        {station.name}, {station.coverage.years} complete years. The small line is rain month by month.
      </Provenance>
    </>
  );
}

function YearSelect({
  value,
  onChange,
  years,
  color,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  years: number[];
  color: string;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      className="h-9 rounded-full border-2 bg-bg px-3 text-[13px] font-semibold text-ink outline-none"
      style={{ borderColor: color }}
    >
      {[...years].reverse().map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

export { STATIONS };
