"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Menu, MenuItem, MenuTrigger } from "@/components/ui/dropdown";
import { Panel, PageHeader, Segmented, TabStrip } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { STATIONS, stationForSite, type Station } from "@/lib/climate";
import { indexBand, MONTH_ABBR, rainfallPercentile } from "@/lib/metrics";

/**
 * Every figure on this page comes from the 30-year daily record: annual
 * totals, the fitted SPEI series and the 1996–2025 monthly normals.
 */

const CHART = { w: 880, h: 260, padL: 42, padR: 12, padT: 14, padB: 30 };

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
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={
          <>
            HISTORY &middot; {station.name.toUpperCase()} &middot; {station.coverage.from.slice(0, 4)}&ndash;
            {station.coverage.to.slice(0, 4)} &middot; {station.coverage.days.toLocaleString("en-GB")} DAILY RECORDS
          </>
        }
        title={tab === "compare" ? "Historical comparison" : "Seasonal archive"}
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
          { value: "compare", label: "Historical comparison" },
          { value: "archive", label: "Seasonal archive" },
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
  const span = max - min || 1;

  const innerW = CHART.w - CHART.padL - CHART.padR;
  const innerH = CHART.h - CHART.padT - CHART.padB;
  const barW = innerW / years.length;
  const yOf = (v: number) => CHART.padT + innerH - ((v - min) / span) * innerH;
  const zero = yOf(0);

  const monthsOf = (year: number) =>
    station.months.filter((m) => m.y === year).sort((a, b) => a.m - b.m);
  const a = monthsOf(yearA);
  const b = monthsOf(yearB);

  return (
    <>
      <Panel className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            [
              `${latest.year} RAINFALL`,
              `${latest.precip.toFixed(0)}`,
              "mm",
              pct == null ? null : `P${pct} of ${years.length} years`,
            ],
            [
              `${years.length}-YEAR MEAN`,
              `${meanPrecip}`,
              "mm",
              `${latest.precip >= meanPrecip ? "+" : ""}${(latest.precip - meanPrecip).toFixed(0)} mm vs mean`,
            ],
            [
              "DRIEST ON RECORD",
              `${driest.year}`,
              "",
              `${driest.precip.toFixed(0)} mm · balance ${driest.balance.toFixed(0)} mm`,
            ],
            [
              `${latest.year} MONTHS IN DROUGHT`,
              `${latest.monthsInDrought}`,
              "/ 12",
              latest.minSpei3 == null ? "SPEI-3 not fitted" : `min SPEI-3 ${latest.minSpei3.toFixed(2)}`,
            ],
          ] as const
        ).map(([k, v, unit, note], i) => (
          <div
            key={k}
            className={`flex flex-col gap-2 border-b border-divider px-5 py-4.5 xl:border-b-0 ${
              i < 3 ? "xl:border-r" : ""
            }`}
          >
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">{k}</span>
            <span className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-heading text-[44px] font-semibold leading-none tabular-nums">{v}</span>
              {unit && <span className="font-mono text-xs text-muted">{unit}</span>}
            </span>
            {note && <span className="font-mono text-[11px] text-muted">{note}</span>}
          </div>
        ))}
      </Panel>

      {/* ── Full record ───────────────────────────────────────────────── */}
      <Panel className="flex flex-col gap-3 px-5 py-4.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-heading text-[17px] font-semibold">
            Every year on record &middot; {station.coverage.from.slice(0, 4)}&ndash;{station.coverage.to.slice(0, 4)}
          </span>
          <Segmented
            size="sm"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "precip", label: "Rainfall" },
              { value: "balance", label: "P − ET₀" },
              { value: "spei", label: "SPEI-3" },
            ]}
          />
        </div>

        <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} className="block w-full">
          <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1={CHART.padL} x2={CHART.w - CHART.padR} y1={CHART.padT + innerH * f} y2={CHART.padT + innerH * f} />
            ))}
          </g>

          {years.map((y, i) => {
            const v = series[i];
            const top = Math.min(yOf(v), zero);
            const h = Math.abs(yOf(v) - zero);
            const isDriest = y.year === driest.year;
            const isLatest = y.year === latest.year;
            return (
              <g key={y.year}>
                <rect
                  x={CHART.padL + i * barW + 1.5}
                  y={top}
                  width={barW - 3}
                  height={Math.max(1, h)}
                  fill={v < 0 ? "#D96565" : "var(--ap-accent)"}
                  fillOpacity={isDriest || isLatest ? 0.95 : 0.45}
                  stroke={isLatest ? "var(--ap-text)" : "none"}
                  strokeWidth={isLatest ? 1.2 : 0}
                />
                <text
                  x={CHART.padL + i * barW + barW / 2}
                  y={CHART.h - 10}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }}
                  fontSize={8.5}
                >
                  {String(y.year).slice(2)}
                </text>
              </g>
            );
          })}

          <line x1={CHART.padL} x2={CHART.w - CHART.padR} y1={zero} y2={zero} style={{ stroke: "var(--ap-text)", strokeOpacity: 0.35 }} />
          <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
            <text x={CHART.padL - 6} y={CHART.padT + 4} textAnchor="end">{max.toFixed(0)}</text>
            <text x={CHART.padL - 6} y={zero + 3} textAnchor="end">0</text>
            <text x={CHART.padL - 6} y={CHART.padT + innerH} textAnchor="end">{min.toFixed(0)}</text>
          </g>
        </svg>

        <Provenance>
          {station.name} &middot; {station.coverage.days.toLocaleString("en-GB")} daily observations &middot;
          {metric === "spei" ? " SPEI-3 fitted per calendar month" : " measured totals"}
        </Provenance>
      </Panel>

      {/* ── Year vs year ──────────────────────────────────────────────── */}
      <Panel className="flex flex-col gap-3 px-5 py-4.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-heading text-[17px] font-semibold">Year against year &middot; monthly rainfall</span>
          <div className="flex items-center gap-2 font-mono text-[11.5px]">
            <YearSelect value={yearA} onChange={setYearA} years={years.map((y) => y.year)} border="var(--ap-accent)" label="First year" />
            <span className="text-muted">vs</span>
            <YearSelect value={yearB} onChange={setYearB} years={years.map((y) => y.year)} border="var(--ap-teal)" label="Second year" />
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
  const w = 880;
  const h = 250;
  const padL = 42;
  const padB = 34;
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
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
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
        <path d={line(a)} fill="none" style={{ stroke: "var(--ap-accent)" }} strokeWidth={2} />
        <path d={line(b)} fill="none" style={{ stroke: "var(--ap-teal)" }} strokeWidth={2} strokeDasharray="6 4" />

        <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9.5}>
          <text x={padL - 6} y={20} textAnchor="end">{max.toFixed(0)}</text>
          <text x={padL - 6} y={16 + innerH} textAnchor="end">0</text>
          {MONTH_ABBR.map((mm, i) => (
            <text key={mm} x={x(i + 1)} y={h - 12} textAnchor="middle" fontSize={9}>
              {mm[0]}
            </text>
          ))}
        </g>
      </svg>

      <div className="grid grid-cols-2 border border-divider font-mono text-[11px] sm:grid-cols-3">
        <div className="border-r border-divider px-3 py-2">
          <div className="text-[10px] text-muted">ANNUAL TOTAL</div>
          <span className="text-accent">{totalA.toFixed(0)}</span> / <span className="text-teal">{totalB.toFixed(0)}</span> mm
        </div>
        <div className="border-r border-divider px-3 py-2">
          <div className="text-[10px] text-muted">30-YEAR MEAN</div>
          {station.normals.reduce((s, n) => s + n.precip, 0).toFixed(0)} mm
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] text-muted">RAIN DAYS ({yearA} / {yearB})</div>
          {station.months.filter((m) => m.y === yearA).reduce((s, m) => s + m.rd, 0)} /{" "}
          {station.months.filter((m) => m.y === yearB).reduce((s, m) => s + m.rd, 0)}
        </div>
      </div>

      <Provenance>
        Dashed line is the {station.coverage.years}-year monthly normal for {station.name}
      </Provenance>
    </>
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
                <span className="font-heading text-[22px] font-semibold">{y.year}</span>
                <span
                  className="border px-2 py-0.5 font-mono text-[10.5px]"
                  style={{
                    borderColor: wetter ? "rgb(56 168 138 / 0.45)" : "rgb(217 101 101 / 0.45)",
                    color: wetter ? "#38A88A" : "#E07B7B",
                  }}
                >
                  {wetter ? "ABOVE MEAN" : "BELOW MEAN"}
                </span>
              </div>
              <svg viewBox="0 0 200 42" preserveAspectRatio="none" className="block h-10 w-full">
                <path d={d} fill="none" stroke={wetter ? "var(--ap-accent)" : "#D96565"} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="grid grid-cols-3 border-t border-divider pt-2.5 font-mono text-[11px]">
                <div>
                  <div className="text-[9.5px] text-muted">RAIN</div>
                  {y.precip.toFixed(0)} mm
                </div>
                <div>
                  <div className="text-[9.5px] text-muted">P &minus; ET&#8320;</div>
                  {y.balance.toFixed(0)} mm
                </div>
                <div>
                  <div className="text-[9.5px] text-muted">RAIN DAYS</div>
                  {months.reduce((s, m) => s + m.rd, 0)}
                </div>
              </div>
              <div className="font-mono text-[11px] text-muted">
                {y.minSpei3 == null ? (
                  "SPEI-3 not fitted"
                ) : (
                  <>
                    min SPEI-3 {y.minSpei3.toFixed(2)} &middot; {indexBand(y.minSpei3)}
                    {y.monthsInDrought > 0 && ` · ${y.monthsInDrought} mo ≤ −1`}
                  </>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      <Provenance>
        {station.name} &middot; {station.coverage.years} complete years &middot; sparkline is monthly rainfall
      </Provenance>
    </>
  );
}

function YearSelect({
  value,
  onChange,
  years,
  border,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  years: number[];
  border: string;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      className="h-7 border bg-bg px-1.5 font-mono text-[11.5px] text-ink outline-none"
      style={{ borderColor: border }}
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
