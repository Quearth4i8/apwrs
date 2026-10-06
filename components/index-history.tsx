"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Panel, Segmented } from "@/components/ui/primitives";
import { HoverGuide, HoverReadout, useBarHover, useElementWidth } from "@/components/ui/chart-hover";
import type { Station } from "@/lib/climate";
import { indexBand, MONTH_ABBR } from "@/lib/metrics";

/**
 * Every month of a standardised drought index, as diverging bars, with the
 * index, its timescale and the period picked from filters.
 *
 * SPEI accumulates rain minus ET₀, so it feels evaporative demand; SPI
 * accumulates rain alone. The timescale is how many months each value
 * looks back over: one month reacts to the last few weeks, twelve carries
 * the whole year. Both are fitted per calendar month over the record, so
 * zero is a normal month for the time of year and −1 is drier than about
 * 84% of years, which counts as drought.
 */

type Index = "spei" | "spi";
export type Period = "5" | "10" | "all";

const SCALES: Record<Index, number[]> = { spei: [1, 3, 6, 12], spi: [1, 3, 12] }; // SPI has no 6-month fit

const BANDS = [
  { label: "Extremely dry", to: -2, color: "#D96565" },
  { label: "Severely dry", to: -1.5, color: "#EE8434" },
  { label: "Moderately dry", to: -1, color: "#E7A83B" },
  { label: "Near normal", to: 1, color: "#38A88A" },
  { label: "Wet", to: 99, color: "#2BA6B8" },
];
const colorOf = (v: number) => BANDS.find((b) => v <= b.to)?.color ?? "#2BA6B8";

const LIMIT = 3; // the axis runs −3 to +3; rarer values pin to the edge

export function IndexHistory({ station }: { station: Station }) {
  const [index, setIndex] = React.useState<Index>("spei");
  const [scale, setScale] = React.useState(3);
  const [period, setPeriod] = React.useState<Period>("all");

  // SPI has no six-month series; fall back to three.
  const pickIndex = (i: Index) => {
    setIndex(i);
    if (!SCALES[i].includes(scale)) setScale(3);
  };

  const all = (station[index][String(scale)] ?? []) as (number | null)[];
  const { months, values } = sliceYears(station, all, period);

  const code = `${index.toUpperCase()}-${scale}`;
  const stats = summarise(months, values);

  return (
    <Panel className="flex flex-col gap-5 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Drought Index</span>
          <span className="text-[13px] text-muted">
            {index === "spei" ? "Water balance: rain minus evaporation" : "Rainfall only"} · {scale}-month window ·{" "}
            {months.length ? `${months[0].y}–${months[months.length - 1].y}` : "—"}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={index}
            onChange={pickIndex}
            options={[
              { value: "spei", label: "SPEI" },
              { value: "spi", label: "SPI" },
            ]}
          />
          <Segmented
            size="sm"
            value={String(scale)}
            onChange={(v) => setScale(Number(v))}
            options={SCALES[index].map((k) => ({ value: String(k), label: `${k} mo` }))}
          />
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* ── Headline figures for the filtered period ──────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat
          label="Latest"
          value={stats.latest ? signed(stats.latest.v) : "—"}
          note={stats.latest ? `${indexBand(stats.latest.v)} · ${monthName(stats.latest.m)}` : "Not fitted"}
          color={stats.latest ? colorOf(stats.latest.v) : undefined}
        />
        <Stat
          label="Drought months"
          value={stats.count ? `${stats.drought}` : "—"}
          note={stats.count ? `${Math.round((stats.drought / stats.count) * 100)}% of ${stats.count} months` : undefined}
          color={stats.drought ? "#E7A83B" : undefined}
        />
        <Stat
          label="Driest month"
          value={stats.min ? signed(stats.min.v) : "—"}
          note={stats.min ? monthName(stats.min.m) : undefined}
          color={stats.min ? colorOf(stats.min.v) : undefined}
        />
        <Stat
          label="Wettest month"
          value={stats.max ? signed(stats.max.v) : "—"}
          note={stats.max ? monthName(stats.max.m) : undefined}
          color={stats.max ? colorOf(stats.max.v) : undefined}
        />
      </div>

      <AnimatedBars months={months} values={values} code={code} id={`${code}-${period}`} />

      <BandLegend />
    </Panel>
  );
}

/** The band colours and the drought threshold, under any index chart. */
export function BandLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
      {BANDS.map((b) => (
        <span key={b.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: b.color }} />
          {b.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t-[1.5px] border-dashed" style={{ borderColor: "#D96565" }} />
        Drought threshold (−1)
      </span>
    </div>
  );
}

/** Months from the start of the last `period` years of the record. */
export function sliceYears<T>(station: Station, series: T[], period: Period) {
  const lastYear = station.months[station.months.length - 1].y;
  const years = period === "all" ? Infinity : Number(period);
  const from = Math.max(0, station.months.findIndex((m) => m.y > lastYear - years));
  return { months: station.months.slice(from), values: series.slice(from) };
}

/** The 5 / 10 / 30-year filter. */
export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <Segmented
      size="sm"
      value={value}
      onChange={onChange}
      options={[
        { value: "5", label: "5 y" },
        { value: "10", label: "10 y" },
        { value: "all", label: "30 y" },
      ]}
    />
  );
}

/** The bars, faded across whenever what they show changes. */
export function AnimatedBars({
  months,
  values,
  code,
  id,
}: {
  months: Station["months"];
  values: (number | null)[];
  code: string;
  id: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Bars months={months} values={values} code={code} />
      </motion.div>
    </AnimatePresence>
  );
}

function Bars({ months, values, code }: { months: Station["months"]; values: (number | null)[]; code: string }) {
  const [ref, w] = useElementWidth<HTMLDivElement>(880);
  const h = 240;
  const padL = 34;
  const padR = 10;
  const padT = 12;
  const padB = 26;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const slot = innerW / Math.max(1, months.length);
  const y = (v: number) => padT + innerH / 2 - (Math.max(-LIMIT, Math.min(LIMIT, v)) / LIMIT) * (innerH / 2);
  const zero = y(0);

  const hover = useBarHover(months.length, padL, padR, w);
  const at = hover.index;

  // A year label wherever it fits: every year when there is room, else every fifth.
  const step = slot * 12 > 34 ? 1 : 5;
  const yearTicks = months.map((m, i) => ({ ...m, i })).filter((m) => m.m === 1 && m.y % step === 0);

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={padL} right={padR} width={w}>
        {at != null && months[at] && (
          <>
            {monthName(months[at])} &middot; {code}{" "}
            {values[at] == null ? "not fitted" : `${signed(values[at]!)} · ${indexBand(values[at]!)}`}
          </>
        )}
      </HoverReadout>
      <svg width={w} height={h} className="block">
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.07 }}>
          {[-2, 2].map((t) => (
            <line key={t} x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <line
          x1={padL}
          x2={w - padR}
          y1={y(-1)}
          y2={y(-1)}
          stroke="#D96565"
          strokeOpacity={0.6}
          strokeDasharray="4 3"
        />

        <HoverGuide hover={hover} left={padL} right={padR} width={w} top={padT} bottom={padT + innerH} />

        {values.map((v, i) => {
          if (v == null) return null;
          const top = Math.min(y(v), zero);
          const bh = Math.max(0.8, Math.abs(y(v) - zero));
          const gap = slot > 6 ? Math.min(2, slot * 0.18) : 0.3;
          return (
            <motion.rect
              key={i}
              x={padL + i * slot + gap / 2}
              width={Math.max(0.8, slot - gap)}
              rx={Math.min(2, slot / 3)}
              fill={colorOf(v)}
              fillOpacity={at == null || at === i ? 0.9 : 0.4}
              // Bars grow out of the zero line.
              initial={{ y: zero, height: 0 }}
              animate={{ y: top, height: bh }}
              transition={{ duration: 0.5, delay: Math.min(0.25, i * 0.0015), ease: [0.2, 0.8, 0.2, 1] }}
            />
          );
        })}

        <line x1={padL} x2={w - padR} y1={zero} y2={zero} style={{ stroke: "var(--ap-text)", strokeOpacity: 0.35 }} />

        <g style={{ fill: "var(--ap-muted)" }} fontSize={11.5}>
          {[2, 0, -2].map((t) => (
            <text key={t} x={padL - 8} y={y(t) + 4} textAnchor="end">
              {t > 0 ? `+${t}` : t}
            </text>
          ))}
          {yearTicks.map((m) => (
            <text key={m.i} x={padL + m.i * slot + slot * 6} y={h - 7} textAnchor="middle">
              {step === 1 && months.length > 72 ? `'${String(m.y).slice(2)}` : m.y}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

function Stat({ label, value, note, color }: { label: string; value: string; note?: string; color?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
      <span className="flex items-center gap-1.5 text-[12px] text-muted">
        {color && <span className="size-2 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <span className="text-[20px] font-semibold leading-none tabular-nums">{value}</span>
      {note && <span className="truncate text-[11.5px] text-muted">{note}</span>}
    </div>
  );
}

type Point = { v: number; m: Station["months"][number] };

function summarise(months: Station["months"], values: (number | null)[]) {
  let latest: Point | null = null;
  let min: Point | null = null;
  let max: Point | null = null;
  let drought = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) continue;
    const p: Point = { v, m: months[i] };
    count++;
    if (v <= -1) drought++;
    latest = p;
    if (min == null || v < min.v) min = p;
    if (max == null || v > max.v) max = p;
  }
  return { latest, min, max, drought, count };
}

const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
const monthName = (m: { y: number; m: number }) => {
  const a = MONTH_ABBR[m.m - 1];
  return `${a.charAt(0)}${a.slice(1).toLowerCase()} ${m.y}`;
};
