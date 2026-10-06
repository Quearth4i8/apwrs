"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Menu, MenuItem, MenuTrigger, Popover } from "@/components/ui/dropdown";
import { Panel, PageHeader, Segmented } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { StatTile } from "@/components/ui/simple";
import { cn } from "@/lib/utils";
import { useBarHover, HoverReadout, HoverGuide, useElementWidth } from "@/components/ui/chart-hover";
import { STATIONS, stationForSite, type Station } from "@/lib/climate";

/**
 * Every figure on this page comes from the 30-year daily record: annual
 * totals, monthly figures and, for the day view, the daily record.
 */

export function PageHistory() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const [metric, setMetric] = React.useState<Metric>("precip");

  return (
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title="Past years"
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

      <Trends station={station} metric={metric} setMetric={setMetric} />
    </div>
  );
}

/* ── Trends ──────────────────────────────────────────────────────────── */

type MonthRow = Station["months"][number];

/** Daily tmean, humidity, wind and radiation: lib/generated/daily.json, loaded on demand. */
type DailyExtra = Record<string, { from: string; tm: number[]; rh: number[]; ws: number[]; rs: number[] }>;

/**
 * The variables the chart can show. Totals (rain, ET₀) add up over a month
 * or a year; the rest are means, so a longer period shows their average.
 */
// Each variable has its own colour: warm for temperature and sun, blues for
// water in the air and on the ground, green for the crop's water demand.
const METRICS = {
  tmean: { color: "#E0663F", label: "Mean temperature", unit: "°C", total: false, digits: 1, month: (r: MonthRow) => r.tm },
  precip: { color: "#2F7FD1", label: "Precipitation", unit: "mm", total: true, digits: 0, month: (r: MonthRow) => r.p },
  rs: { color: "#E7A83B", label: "Solar radiation", unit: "MJ/m²/day", total: false, digits: 1, month: (r: MonthRow) => r.rs },
  wind: { color: "#7B8FD9", label: "Wind speed", unit: "m/s", total: false, digits: 2, month: (r: MonthRow) => r.ws },
  rh: { color: "#2BA6B8", label: "Relative humidity", unit: "%", total: false, digits: 1, month: (r: MonthRow) => r.rh },
  et0: { color: "#38A88A", label: "Evapotranspiration", unit: "mm", total: true, digits: 0, month: (r: MonthRow) => r.e },
} as const;

type Metric = keyof typeof METRICS;
type Resolution = "day" | "month" | "year";

const MONTH_NAME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Trends({ station, metric, setMetric }: { station: Station; metric: Metric; setMetric: (m: Metric) => void }) {
  const years = station.annual;
  const driest = [...years].sort((a, b) => a.balance - b.balance)[0];
  const def = METRICS[metric];

  const first = station.months[0];
  const last = station.months[station.months.length - 1];
  const [res, setRes] = React.useState<Resolution>("year");
  const [year, setYear] = React.useState(last.y);

  // The rain and driest-month tiles follow the year picked in the filter.
  const picked = years.find((y) => y.year === year) ?? years[years.length - 1];
  const driestMonth = station.months
    .filter((m) => m.y === picked.year)
    .reduce((d, m) => (m.p < d.p ? m : d));
  const [month, setMonth] = React.useState(last.m);

  // Daily values beyond rain and ET₀ live in a separate file, fetched the
  // first time the day view opens.
  const [extra, setExtra] = React.useState<DailyExtra | null>(null);
  React.useEffect(() => {
    if (res !== "day" || extra) return;
    let live = true;
    import("@/lib/generated/daily.json").then((m) => {
      if (live) setExtra(m.default as DailyExtra);
    });
    return () => {
      live = false;
    };
  }, [res, extra]);

  const points = React.useMemo(
    () => seriesFor(station, metric, res, year, month, extra),
    [station, metric, res, year, month, extra],
  );

  // Step the period the arrows move through: a year in the month view, a
  // month in the day view, clamped to the record.
  const step = (d: number) => {
    if (res === "month") {
      setYear((y) => Math.min(last.y, Math.max(first.y, y + d)));
    } else {
      const idx = Math.min(last.y * 12 + last.m - 1, Math.max(first.y * 12 + first.m - 1, year * 12 + month - 1 + d));
      setYear(Math.floor(idx / 12));
      setMonth((idx % 12) + 1);
    }
  };
  const atStart = res === "month" ? year <= first.y : year * 12 + month <= first.y * 12 + first.m;
  const atEnd = res === "month" ? year >= last.y : year * 12 + month >= last.y * 12 + last.m;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon="rain" label={`Rain in ${picked.year}`} value={picked.precip.toFixed(0)} unit="mm" />
        <StatTile icon="sun" tint="#D96565" label="Driest year" value={driest.year} />
        <StatTile icon="calendar" tint="#E7A83B" label={`Driest month in ${picked.year}`} value={MONTH_NAME[driestMonth.m - 1]} />
      </div>

      <Panel className="flex flex-col gap-4 px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <ParameterSelect value={metric} onChange={setMetric} />

          {/* ── Period filter ─────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              size="sm"
              value={res}
              onChange={setRes}
              options={[
                { value: "day", label: "Day" },
                { value: "month", label: "Month" },
                { value: "year", label: "Year" },
              ]}
            />
            {res !== "year" && (
              <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-[3px]">
                <StepButton icon="left" label="Previous" disabled={atStart} onClick={() => step(-1)} />
                {res === "day" && (
                  <Picker
                    label="Month"
                    value={MONTH_NAME[month - 1]}
                    options={MONTH_NAME.map((n, i) => ({ value: i + 1, label: n.slice(0, 3) }))}
                    selected={month}
                    onSelect={setMonth}
                    columns={3}
                  />
                )}
                <Picker
                  label="Year"
                  value={String(year)}
                  options={years.map((y) => ({ value: y.year, label: String(y.year) }))}
                  selected={year}
                  onSelect={setYear}
                  columns={5}
                />
                <StepButton icon="right" label="Next" disabled={atEnd} onClick={() => step(1)} />
              </div>
            )}
          </div>
        </div>

        {/* A new parameter, view or period redraws the chart from the left. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${res}-${metric}-${res === "year" ? "" : year}-${res === "day" ? month : ""}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {points ? (
              <TrendLine points={points} digits={def.digits} unit={def.unit} color={def.color} />
            ) : (
              <div className="grid h-[250px] place-items-center text-[13px] text-muted">Loading daily weather…</div>
            )}
          </motion.div>
        </AnimatePresence>

        <Provenance>
          {station.name}, {station.coverage.days.toLocaleString("en-GB")} days of measured weather
        </Provenance>
      </Panel>
    </>
  );
}

interface Point {
  /** Axis label. */
  tick: string;
  /** Hover label. */
  label: string;
  v: number;
}

/** The chosen variable at the chosen resolution; null while daily data loads. */
function seriesFor(
  station: Station,
  metric: Metric,
  res: Resolution,
  year: number,
  month: number,
  extra: DailyExtra | null,
): Point[] | null {
  const def = METRICS[metric];

  if (res === "year") {
    return station.annual.map((a) => {
      const vals = station.months.filter((m) => m.y === a.year).map(def.month);
      const sum = vals.reduce((s, v) => s + v, 0);
      return { tick: `'${String(a.year).slice(2)}`, label: String(a.year), v: def.total ? sum : sum / (vals.length || 1) };
    });
  }

  if (res === "month") {
    return station.months
      .filter((m) => m.y === year)
      .sort((a, b) => a.m - b.m)
      .map((m) => ({ tick: MONTH_NAME[m.m - 1].slice(0, 3), label: `${MONTH_NAME[m.m - 1]} ${year}`, v: def.month(m) }));
  }

  // Day: rain and ET₀ ship with the station record, the rest load separately.
  let values: number[];
  let from: string;
  if (metric === "precip" || metric === "et0") {
    values = station.series[metric];
    from = station.series.from;
  } else {
    const d = extra?.[station.id];
    if (!d) return null;
    values = metric === "tmean" ? d.tm : metric === "rh" ? d.rh : metric === "wind" ? d.ws : d.rs;
    from = d.from;
  }
  const start = Date.parse(`${from}T00:00:00Z`);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out: Point[] = [];
  for (let day = 1; day <= days; day++) {
    const i = Math.round((Date.UTC(year, month - 1, day) - start) / 86_400_000);
    if (i < 0 || i >= values.length) continue;
    out.push({ tick: String(day), label: `${day} ${MONTH_NAME[month - 1]} ${year}`, v: values[i] });
  }
  return out;
}

/** How long the line takes to draw, s. */
const DRAW = 1.1;

/** One point per period, with a hover readout. */
function TrendLine({
  points,
  digits,
  unit: rawUnit,
  color,
}: {
  points: Point[];
  digits: number;
  unit: string;
  color: string;
}) {
  const [ref, w] = useElementWidth<HTMLDivElement>(880);
  const h = 250;
  const padL = 48;
  const padR = 12;
  const padT = 16;
  const padB = 30;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const hi = Math.max(...points.map((r) => r.v));
  const { ticks, min, max, decimals } = niceAxis(0, hi);
  const slot = innerW / Math.max(1, points.length);
  const x = (i: number) => padL + (i + 0.5) * slot;
  const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;
  const unit = rawUnit === "%" || rawUnit === "°C" ? rawUnit : ` ${rawUnit}`;
  const every = slot > 26 ? 1 : slot > 13 ? 2 : 5;

  const hover = useBarHover(points.length, padL, padR, w);
  const at = hover.index == null ? null : points[hover.index];
  const line = "M" + points.map((r, i) => `${x(i).toFixed(1)} ${y(r.v).toFixed(1)}`).join("L");

  if (!points.length) {
    return <div className="grid h-[250px] place-items-center text-[13px] text-muted">No data for this period.</div>;
  }

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={padL} right={padR} width={w}>
        {at && (
          <>
            {at.label} &middot; {at.v.toFixed(digits)}
            {unit}
          </>
        )}
      </HoverReadout>
      <svg width={w} height={h} className="block">
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
          {ticks.map((t, k) => (
            <motion.line
              key={t}
              x1={padL}
              x2={w - padR}
              y1={y(t)}
              y2={y(t)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: k * 0.05 }}
            />
          ))}
        </g>

        <HoverGuide hover={hover} left={padL} right={padR} width={w} top={padT} bottom={padT + innerH} />

        {/* The line draws itself left to right; each point pops in as the line reaches it. */}
        <motion.path
          d={line}
          fill="none"
          style={{ stroke: color }}
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: DRAW, ease: [0.4, 0, 0.2, 1] }}
        />
        {points.length <= 40 &&
          points.map((r, i) => (
            <motion.circle
              key={i}
              cx={x(i)}
              cy={y(r.v)}
              r={3}
              style={{ fill: color, stroke: "var(--ap-surface)" }}
              strokeWidth={2}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22, delay: (i / Math.max(1, points.length - 1)) * DRAW * 0.9 }}
            />
          ))}
        {at && (
          <circle
            cx={x(hover.index!)}
            cy={y(at.v)}
            r={5.5}
            style={{ fill: color, stroke: "var(--ap-surface)" }}
            strokeWidth={2.5}
          />
        )}

        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          {ticks.map((t) => (
            <text key={t} x={padL - 8} y={y(t) + 4} textAnchor="end">
              {t.toFixed(decimals)}
            </text>
          ))}
          {points.map(
            (r, i) =>
              i % every === 0 && (
                <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fontSize={11.5}>
                  {r.tick}
                </text>
              ),
          )}
        </g>
      </svg>
    </div>
  );
}

/**
 * Round axis ticks: a step of 1, 2 or 5 times a power of ten giving about
 * four intervals, with the axis ends snapped to whole steps. 0/10/20/30, not
 * 0/17/35.
 */
function niceAxis(lo: number, hi: number) {
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const raw = (hi - lo) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 2, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? 10 * mag;
  // Whole numbers once the values are in double figures; only small ones
  // such as wind speed need a decimal step.
  if (hi >= 10) step = Math.max(1, step);
  // None of these variables can be negative.
  const min = Math.max(0, Math.floor(lo / step) * step);
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(+t.toFixed(6));
  return { ticks, min, max, decimals: step >= 1 ? 0 : Math.ceil(-Math.log10(step)) };
}

/** The variable picker: a labelled field showing the unit, with a dropdown list. */
function ParameterSelect({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  const def = METRICS[value];
  return (
    <div className="flex w-[280px] max-w-full flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        Parameter
        <span className="rounded-[6px] bg-accent-100 px-1.5 py-px text-[11px] normal-case tracking-normal text-accent">
          {def.unit}
        </span>
      </span>
      <Menu
        className="max-h-[320px] overflow-y-auto"
        sideOffset={6}
        trigger={
          <button
            type="button"
            aria-label="Parameter"
            className={cn(
              "group flex h-10 w-full items-center justify-between gap-2 rounded-[10px] border border-divider bg-bg px-3.5 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-150",
              "hover:border-[var(--ap-accent)] focus-visible:border-[var(--ap-accent)]",
              "data-[state=open]:border-[var(--ap-accent)] data-[state=open]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ap-accent)_18%,transparent)]",
            )}
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              <span className="size-2 flex-none rounded-full" style={{ background: def.color }} />
              {def.label} <span className="text-muted">({def.unit})</span>
            </span>
            <span className="text-muted transition-transform duration-150 group-data-[state=open]:rotate-180">
              <Icon name="down" size={15} />
            </span>
          </button>
        }
      >
        {(Object.keys(METRICS) as Metric[]).map((k) => {
          const on = k === value;
          return (
            <MenuItem
              key={k}
              onSelect={() => onChange(k)}
              className={cn(
                "h-9 text-[13.5px]",
                on &&
                  "bg-accent-100 font-semibold before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--ap-accent)]",
              )}
            >
              <span className="mr-2 inline-block size-2 rounded-full align-middle" style={{ background: METRICS[k].color }} />
              {METRICS[k].label} <span className="font-normal text-muted">({METRICS[k].unit})</span>
            </MenuItem>
          );
        })}
      </Menu>
    </div>
  );
}

/** A round arrow in the period stepper. */
function StepButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: "left" | "right";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-[26px] place-items-center rounded-full text-muted transition-colors hover:bg-s2 hover:text-ink disabled:pointer-events-none disabled:opacity-35"
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

/**
 * A compact picker inside the period stepper: the choices laid out as a grid
 * (years chronologically, months as a 3 × 4 calendar) so the whole range is
 * visible at once, with the current one filled.
 */
function Picker({
  label,
  value,
  options,
  selected,
  onSelect,
  columns,
}: {
  label: string;
  value: string;
  options: { value: number; label: string }[];
  selected: number;
  onSelect: (v: number) => void;
  columns: number;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="p-2.5"
      trigger={
        <MenuTrigger aria-label={label} className="h-[26px] gap-1.5 bg-s2 px-3 font-semibold shadow-[0_1px_3px_rgb(0_0_0/0.18)]">
          {value}
          <Icon name="down" size={13} />
        </MenuTrigger>
      }
    >
      <div className="px-1 pb-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const on = o.value === selected;
          return (
            <button
              key={o.value}
              type="button"
              autoFocus={on}
              aria-pressed={on}
              onClick={() => {
                onSelect(o.value);
                setOpen(false);
              }}
              className={cn(
                "h-8 min-w-[52px] rounded-[8px] px-2 text-[13px] tabular-nums outline-none transition-colors duration-100",
                "focus-visible:ring-2 focus-visible:ring-[var(--ap-accent)]",
                on ? "bg-[var(--ap-accent)] font-semibold text-white" : "text-ink hover:bg-neutral-100",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}

export { STATIONS };
