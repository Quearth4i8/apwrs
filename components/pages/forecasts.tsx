"use client";

import * as React from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useConsole } from "@/components/app-context";
import { Icon, type IconName } from "@/components/icon";
import { Panel, PageHeader, Segmented } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { StatTile } from "@/components/ui/simple";
import { useBarHover, HoverReadout, HoverGuide, useElementWidth } from "@/components/ui/chart-hover";
import { SOIL_MODEL, stationForSite, type Station } from "@/lib/climate";
import { useForecast, type ForecastPayload } from "@/lib/use-forecast";

/**
 * Live daily forecast for the selected station, with a FAO-56 root-zone
 * water balance run forward over it.
 *
 * There is no ensemble behind this feed, so there are no confidence
 * intervals — and none are drawn. The recommended-action column the
 * prototype carried is gone: nothing generates advice.
 */

type Day = ForecastPayload["days"][number];

const EASE = [0.2, 0.8, 0.2, 1] as const;
const RAIN = "var(--ap-accent)";
const ET = "#EE8434";

export function PageForecasts() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const { data, error } = useForecast(station.id);

  return (
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title="Forecasts"
        lede={
          data
            ? `Weather at ${station.name} for the next ${data.horizonDays} days, to ${fmtDay(data.days[data.days.length - 1].date, true)}.`
            : "Loading the forecast…"
        }
      />

      {error && (
        <NoData
          icon="cloud"
          title="Forecast unavailable"
          what="The weather service could not be reached, so there is nothing to show. The 30-year station record on Historical Comparison is unaffected."
          needs="connection to Open-Meteo"
        />
      )}

      {!data && !error && <Skeleton />}

      {data && <ForecastBody key={station.id} station={station} data={data} />}
    </div>
  );
}

const fmtDay = (iso: string, year = false) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });
const weekday = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });

/** Rises from below, after `i` steps of the stagger. */
const rise = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: i * 0.06, ease: EASE },
});

function ForecastBody({ station, data }: { station: Station; data: ForecastPayload }) {
  const days = data.days;
  const future = days.filter((d) => d.forecast);
  const [showTable, setShowTable] = React.useState(false);

  const sum = (rows: Day[], k: "precip" | "et0") => rows.reduce((a, r) => a + (r[k] ?? 0), 0);

  const next7 = future.slice(0, 7);
  const next14 = future.slice(0, 14);
  const bal7 = sum(next7, "precip") - sum(next7, "et0");

  /* Root-zone balance carried forward day by day over the whole window. */
  const balance = React.useMemo(() => runBalance(days, station), [days, station]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div {...rise(0)}>
          <StatTile icon="rain" label="Rain, next 7 days" value={<CountUp value={sum(next7, "precip")} />} unit="mm" />
        </motion.div>
        <motion.div {...rise(1)}>
          <StatTile
            icon="cloud"
            tint="#7B8FD9"
            label="Rain, next 14 days"
            value={<CountUp value={sum(next14, "precip")} />}
            unit="mm"
          />
        </motion.div>
        <motion.div {...rise(2)}>
          <StatTile
            icon="sun"
            tint={ET}
            label="Evaporation, next 7 days"
            value={<CountUp value={sum(next7, "et0")} />}
            unit="mm"
          />
        </motion.div>
        <motion.div {...rise(3)}>
          <StatTile
            icon="droplet"
            tint={bal7 < 0 ? ET : RAIN}
            label="Water balance, next 7 days"
            value={
              <span style={{ color: bal7 < 0 ? ET : RAIN }}>
                <CountUp value={bal7} signed />
              </span>
            }
            unit="mm"
          />
        </motion.div>
      </div>

      <motion.div {...rise(4)}>
        <DaysAhead future={future} />
      </motion.div>

      <motion.div {...rise(5)}>
        <Panel className="flex flex-col gap-4 px-5 py-5">
          <DailyPanel days={days} />
          <Provenance>
            {data.source} &middot; issued {fmtDay(data.generatedAt)}{" "}
            {new Date(data.generatedAt).toISOString().slice(11, 16)} UTC
          </Provenance>
        </Panel>
      </motion.div>

      <motion.div {...rise(6)}>
        <Panel className="flex flex-col gap-4 px-5 py-5">
          <BalancePanel rows={balance} />
        </Panel>
      </motion.div>

      {/* ── Daily table, on demand ────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setShowTable((v) => !v)}
          className="group flex w-fit items-center gap-2 rounded-full bg-neutral-100 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-accent-100"
        >
          <Icon name="table" size={14} />
          {showTable ? "Hide daily table" : `Show all ${future.length} forecast days as a table`}
          <span className={`text-muted transition-transform duration-200 ${showTable ? "rotate-180" : ""}`}>
            <Icon name="down" size={14} />
          </span>
        </button>
        <AnimatePresence initial={false}>
          {showTable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="overflow-hidden"
            >
              <ForecastTable future={future} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ── Numbers ─────────────────────────────────────────────────────────── */

/** Counts up to `value` once it appears, then follows it. */
function CountUp({ value, digits = 1, signed = false }: { value: number; digits?: number; signed?: boolean }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${signed && v > 0.05 ? "+" : ""}${v.toFixed(digits)}`);
  React.useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: EASE });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

/* ── Days ahead ──────────────────────────────────────────────────────── */

function skyOf(d: Day): { icon: IconName; color: string; word: string } {
  const p = d.precip ?? 0;
  if (p >= 5) return { icon: "rain", color: "#2F7FD1", word: "Rain" };
  if (p >= 1) return { icon: "rain", color: "var(--ap-accent)", word: "Showers" };
  if (p >= 0.1) return { icon: "cloud", color: "#7B8FD9", word: "Drizzle" };
  return { icon: "sun", color: "#E7A83B", word: "Dry" };
}

function DaysAhead({ future }: { future: Day[] }) {
  const [span, setSpan] = React.useState<"7" | "14" | "all">("7");
  const shown = span === "all" ? future : future.slice(0, Number(span));

  // One temperature scale for the whole strip, so the bars compare.
  const lo = Math.min(...shown.map((d) => d.tmin ?? Infinity));
  const hi = Math.max(...shown.map((d) => d.tmax ?? -Infinity));
  const maxRain = Math.max(...shown.map((d) => d.precip ?? 0), 5);

  return (
    <Panel className="flex flex-col gap-4 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Days ahead</span>
          <span className="text-[13px] text-muted">
            {Math.round(lo)}° to {Math.round(hi)}° · {shown.filter((d) => (d.precip ?? 0) >= 1).length} wet{" "}
            {shown.filter((d) => (d.precip ?? 0) >= 1).length === 1 ? "day" : "days"}
          </span>
        </span>
        <Segmented
          size="sm"
          value={span}
          onChange={setSpan}
          options={[
            { value: "7", label: "7 days" },
            { value: "14", label: "14 days" },
            { value: "all", label: `${future.length} days` },
          ]}
        />
      </div>

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 pt-1">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((d, i) => {
            const sky = skyOf(d);
            const today = i === 0;
            const tmin = d.tmin ?? lo;
            const tmax = d.tmax ?? hi;
            const left = ((tmin - lo) / (hi - lo || 1)) * 100;
            const width = Math.max(6, ((tmax - tmin) / (hi - lo || 1)) * 100);
            return (
              <motion.div
                key={d.date}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.035, ease: EASE }}
                whileHover={{ y: -3 }}
                className={`flex min-w-[118px] flex-1 basis-0 snap-start flex-col gap-2 rounded-[14px] border px-3 py-3.5 ${
                  today
                    ? "border-[var(--ap-accent)] bg-[color-mix(in_srgb,var(--ap-accent)_7%,transparent)]"
                    : "border-divider bg-surface"
                }`}
              >
                <span className="flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold">{today ? "Today" : weekday(d.date)}</span>
                  <span className="text-[11.5px] text-muted">{fmtDay(d.date)}</span>
                </span>
                <span
                  className="grid size-10 place-items-center self-center rounded-full"
                  style={{ color: sky.color, background: `color-mix(in srgb, ${sky.color} 14%, transparent)` }}
                >
                  <Icon name={sky.icon} size={20} strokeWidth={1.8} />
                </span>
                <span className="text-center text-[11.5px] text-muted">{sky.word}</span>

                {/* Temperature range against the strip's own scale. */}
                <span className="flex items-center justify-between text-[13px] tabular-nums">
                  <span className="text-muted">{d.tmin == null ? "—" : `${Math.round(d.tmin)}°`}</span>
                  <span className="font-semibold">{d.tmax == null ? "—" : `${Math.round(d.tmax)}°`}</span>
                </span>
                <span className="relative h-1.5 rounded-full bg-neutral-100">
                  <motion.span
                    className="absolute inset-y-0 rounded-full"
                    style={{ background: "linear-gradient(to right, #7B8FD9, #E7A83B, #E0663F)" }}
                    initial={{ left: `${left}%`, width: 0 }}
                    animate={{ left: `${left}%`, width: `${width}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + Math.min(i, 8) * 0.035, ease: EASE }}
                  />
                </span>

                {/* Rain, scaled to the wettest day shown. */}
                <span className="mt-1 flex items-center gap-1.5 text-[12px] tabular-nums">
                  <span className="relative h-1.5 flex-1 rounded-full bg-neutral-100">
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: "#2F7FD1" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${((d.precip ?? 0) / maxRain) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.15 + Math.min(i, 8) * 0.035, ease: EASE }}
                    />
                  </span>
                  <span className="w-[42px] text-right text-muted">
                    {(d.precip ?? 0) < 0.1 ? "0 mm" : `${(d.precip ?? 0).toFixed(1)} mm`}
                  </span>
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

/* ── Rain and evaporation ────────────────────────────────────────────── */

type Range = "ahead" | "30" | "60";

/** The past window to show before today, with the whole forecast after it. */
function windowOf<T extends { forecast: boolean }>(rows: T[], range: Range) {
  const first = rows.findIndex((r) => r.forecast);
  const past = range === "ahead" ? 0 : Number(range);
  const from = first < 0 ? 0 : Math.max(0, first - past);
  return rows.slice(from);
}

function RangeFilter({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <Segmented
      size="sm"
      value={value}
      onChange={onChange}
      options={[
        { value: "ahead", label: "Forecast" },
        { value: "30", label: "+30 d past" },
        { value: "60", label: "+60 d past" },
      ]}
    />
  );
}

function DailyPanel({ days }: { days: Day[] }) {
  const [range, setRange] = React.useState<Range>("30");
  const rows = windowOf(days, range);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Rain and evaporation, day by day</span>
          <span className="flex flex-wrap items-center gap-3.5 text-[12.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: RAIN }} />
              Rain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full" style={{ background: ET }} />
              Evaporation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-4 rounded-[3px] border border-divider bg-[repeating-linear-gradient(135deg,var(--ap-neutral-100)_0_3px,transparent_3px_6px)]" />
              Forecast
            </span>
          </span>
        </span>
        <RangeFilter value={range} onChange={setRange} />
      </div>
      <Fade id={range}>
        <DailyChart days={rows} />
      </Fade>
    </>
  );
}

/** Cross-fades its child whenever `id` changes. */
function Fade({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

const H = 240;
const PAD = { l: 40, r: 12, t: 22, b: 28 };

/** Month-start ticks across a daily series, as x-positions and labels. */
function dateTicks(dates: string[], x: (i: number) => number) {
  // A label every week on short windows, at month starts on long ones.
  const weekly = dates.length <= 35;
  const ticks = dates
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => (weekly ? i % 7 === 0 : i === 0 || d.slice(8, 10) === "01"))
    .map(({ d, i }) => ({ x: x(i), label: fmtDay(d) }));
  return ticks.length > 1 && ticks[1].x - ticks[0].x < 60 ? ticks.slice(1) : ticks;
}

/** Round steps (1, 2, 5 × 10ⁿ) from zero. */
function niceMax(v: number) {
  const raw = v / 3;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? 10 * mag;
  return { step, max: Math.ceil(v / step) * step };
}

function TodayMarker({ x, top, bottom }: { x: number; top: number; bottom: number }) {
  return (
    <g>
      <line x1={x} x2={x} y1={top} y2={bottom} style={{ stroke: "var(--ap-text)", strokeOpacity: 0.45 }} strokeDasharray="3 3" />
      <rect x={x - 22} y={top - 18} width={44} height={17} rx={8.5} style={{ fill: "var(--ap-text)" }} />
      <text x={x} y={top - 6} textAnchor="middle" fontSize={11} fontWeight={600} style={{ fill: "var(--ap-bg)" }}>
        Today
      </text>
    </g>
  );
}

function ForecastZone({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <defs>
        <pattern id="fc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3" height="6" style={{ fill: "var(--ap-text)" }} fillOpacity={0.035} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={8} style={{ fill: "var(--ap-neutral-100)" }} fillOpacity={0.55} />
      <rect x={x} y={y} width={w} height={h} rx={8} fill="url(#fc-hatch)" />
    </>
  );
}

function DailyChart({ days }: { days: Day[] }) {
  const [ref, W] = useElementWidth<HTMLDivElement>(880);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const top = Math.max(...days.map((d) => Math.max(d.precip ?? 0, d.et0 ?? 0)), 5);
  const { step, max } = niceMax(top);
  const bw = innerW / days.length;
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;
  const firstFuture = days.findIndex((d) => d.forecast);
  const todayX = firstFuture >= 0 ? PAD.l + firstFuture * bw : null;

  const hover = useBarHover(days.length, PAD.l, PAD.r, W);
  const at = hover.index == null ? null : days[hover.index];
  const ticks = dateTicks(days.map((d) => d.date), (i) => PAD.l + i * bw);
  const etLine = "M" + days.map((d, i) => `${(PAD.l + i * bw + bw / 2).toFixed(1)} ${y(d.et0 ?? 0).toFixed(1)}`).join("L");

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={PAD.l} right={PAD.r} width={W}>
        {at && (
          <>
            {weekday(at.date)} {fmtDay(at.date)} &middot; rain {(at.precip ?? 0).toFixed(1)} mm &middot; evaporation{" "}
            {(at.et0 ?? 0).toFixed(1)} mm{at.forecast ? " · forecast" : ""}
          </>
        )}
      </HoverReadout>
      <svg width={W} height={H} className="block">
        {todayX != null && <ForecastZone x={todayX} y={PAD.t} w={W - PAD.r - todayX} h={innerH} />}
        <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.07 }}>
          {Array.from({ length: max / step + 1 }, (_, k) => k * step).map((t) => (
            <line key={t} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
          ))}
        </g>

        {days.map((d, i) => {
          const v = d.precip ?? 0;
          const h = (v / max) * innerH;
          return (
            <motion.rect
              key={d.date}
              x={PAD.l + i * bw + Math.min(1.5, bw * 0.15)}
              width={Math.max(1, bw - 2 * Math.min(1.5, bw * 0.15))}
              rx={Math.min(3, bw / 3)}
              style={{ fill: RAIN }}
              fillOpacity={hover.index === i ? 1 : d.forecast ? 0.6 : 0.85}
              initial={{ y: PAD.t + innerH, height: 0 }}
              animate={{ y: PAD.t + innerH - h, height: h }}
              transition={{ duration: 0.55, delay: Math.min(0.35, i * 0.006), ease: EASE }}
            />
          );
        })}

        <HoverGuide hover={hover} left={PAD.l} right={PAD.r} width={W} top={PAD.t} bottom={PAD.t + innerH} />

        <motion.path
          d={etLine}
          fill="none"
          stroke={ET}
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, delay: 0.15, ease: EASE }}
        />
        {at && (
          <circle
            cx={PAD.l + hover.index! * bw + bw / 2}
            cy={y(at.et0 ?? 0)}
            r={4}
            fill={ET}
            style={{ stroke: "var(--ap-surface)" }}
            strokeWidth={2}
          />
        )}

        {todayX != null && firstFuture > 0 && <TodayMarker x={todayX} top={PAD.t} bottom={PAD.t + innerH} />}

        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          {Array.from({ length: max / step + 1 }, (_, k) => k * step).map((t) => (
            <text key={t} x={PAD.l - 8} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          ))}
          {ticks.map((t) => (
            <text key={t.label} x={t.x} y={H - 8}>
              {t.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ── Soil water balance ──────────────────────────────────────────────── */

/**
 * FAO-56 single-coefficient depletion, seeded from the station's last
 * modelled state and carried forward across the forecast.
 */
function runBalance(days: ForecastPayload["days"], station: Station) {
  const taw = SOIL_MODEL.tawMm;
  const seed = station.recent[station.recent.length - 1]?.soilFraction ?? 0.5;
  const out: { date: string; storage: number; forecast: boolean }[] = [];
  let depletion = taw * (1 - seed);
  for (const d of days) {
    depletion = Math.min(taw, Math.max(0, depletion + (d.et0 ?? 0) - (d.precip ?? 0)));
    out.push({
      date: d.date,
      storage: +(SOIL_MODEL.wiltingPointMm + (taw - depletion)).toFixed(1),
      forecast: d.forecast,
    });
  }
  return out;
}

type BalanceRow = ReturnType<typeof runBalance>[number];

function BalancePanel({ rows }: { rows: BalanceRow[] }) {
  const [range, setRange] = React.useState<Range>("60");
  const shown = windowOf(rows, range);
  const first = shown.find((r) => r.forecast);
  const end = shown[shown.length - 1];
  const pctOf = (mm: number) => Math.round(((mm - SOIL_MODEL.wiltingPointMm) / SOIL_MODEL.tawMm) * 100);
  const change = first && end ? pctOf(end.storage) - pctOf(first.storage) : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Water left in the soil (modelled)</span>
          <span className="text-[13px] text-muted">
            Estimated from rain and evaporation, not measured. See Sensors for S.Sensor&apos;s readings.
          </span>
        </span>
        <RangeFilter value={range} onChange={setRange} />
      </div>

      {first && end && change != null && (
        <div className="flex flex-wrap gap-2.5">
          <Chip label="Today" value={`${pctOf(first.storage)}% available`} />
          <Chip label={`By ${fmtDay(end.date)}`} value={`${pctOf(end.storage)}% available`} />
          <Chip
            label="Change"
            value={`${change > 0 ? "+" : ""}${change} pts`}
            color={change < 0 ? ET : RAIN}
          />
        </div>
      )}

      <Fade id={range}>
        <BalanceChart rows={shown} pctOf={pctOf} />
      </Fade>
    </>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span className="flex items-baseline gap-2 rounded-full bg-neutral-100 px-3.5 py-1.5 text-[12.5px]">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </span>
    </span>
  );
}

function BalanceChart({ rows, pctOf }: { rows: BalanceRow[]; pctOf: (mm: number) => number }) {
  const [ref, W] = useElementWidth<HTMLDivElement>(880);
  const h = 220;
  const innerW = W - PAD.l - PAD.r;
  const innerH = h - PAD.t - PAD.b;
  const max = SOIL_MODEL.fieldCapacityMm;
  const wp = SOIL_MODEL.wiltingPointMm;
  const min = wp - 8;
  const y = (v: number) => PAD.t + innerH - ((v - min) / (max - min)) * innerH;
  const slot = innerW / rows.length;
  const x = (i: number) => PAD.l + (i + 0.5) * slot;
  const firstFuture = rows.findIndex((d) => d.forecast);
  const todayX = firstFuture >= 0 ? PAD.l + firstFuture * slot : null;
  const line = rows.map((r, i) => `${x(i).toFixed(1)} ${y(r.storage).toFixed(1)}`).join("L");
  const ticks = dateTicks(rows.map((r) => r.date), (i) => PAD.l + i * slot);

  const hover = useBarHover(rows.length, PAD.l, PAD.r, W);
  const at = hover.index == null ? null : rows[hover.index];

  return (
    <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
      <HoverReadout hover={hover} left={PAD.l} right={PAD.r} width={W}>
        {at && (
          <>
            {weekday(at.date)} {fmtDay(at.date)} &middot; {at.storage.toFixed(0)} mm &middot; {pctOf(at.storage)}% of the
            water plants can use{at.forecast ? " · forecast" : ""}
          </>
        )}
      </HoverReadout>
      <svg width={W} height={h} className="block">
        <defs>
          <linearGradient id="soil-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--ap-accent)" }} stopOpacity={0.28} />
            <stop offset="100%" style={{ stopColor: "var(--ap-accent)" }} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {todayX != null && <ForecastZone x={todayX} y={PAD.t} w={W - PAD.r - todayX} h={innerH} />}

        {/* Healthy band between wilting point and field capacity. */}
        <rect x={PAD.l} y={y(max)} width={innerW} height={y(wp) - y(max)} fill="#38A88A" fillOpacity={0.05} />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(max)} y2={y(max)} style={{ stroke: "var(--ap-accent)" }} strokeOpacity={0.7} strokeDasharray="4 4" />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(wp)} y2={y(wp)} stroke="#D96565" strokeOpacity={0.8} strokeDasharray="4 4" />

        <motion.path
          d={`M${line}L${x(rows.length - 1)} ${y(min)}L${x(0)} ${y(min)}Z`}
          fill="url(#soil-fill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        <motion.path
          d={`M${line}`}
          fill="none"
          style={{ stroke: "var(--ap-accent)" }}
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
        />

        <HoverGuide hover={hover} left={PAD.l} right={PAD.r} width={W} top={PAD.t} bottom={PAD.t + innerH} />
        {at && (
          <circle
            cx={x(hover.index!)}
            cy={y(at.storage)}
            r={4.5}
            style={{ fill: "var(--ap-accent)", stroke: "var(--ap-surface)" }}
            strokeWidth={2}
          />
        )}

        {todayX != null && firstFuture > 0 && <TodayMarker x={todayX} top={PAD.t} bottom={PAD.t + innerH} />}

        <g fontSize={12}>
          <text x={PAD.l + 6} y={y(max) - 6} style={{ fill: "var(--ap-accent)" }}>
            Soil full ({max} mm)
          </text>
          <text x={PAD.l + 6} y={y(wp) - 6} fill="#E07B7B">
            Plants wilt ({wp} mm)
          </text>
        </g>
        <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
          {ticks.map((t) => (
            <text key={t.label} x={t.x} y={h - 8}>
              {t.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ── Table ───────────────────────────────────────────────────────────── */

function ForecastTable({ future }: { future: Day[] }) {
  const maxRain = Math.max(...future.map((d) => d.precip ?? 0), 1);
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-[13.5px]">
        <thead>
          <tr className="text-[12px] uppercase tracking-[0.06em] text-muted">
            {["Day", "Rain", "Evaporation", "Balance", "Low", "High"].map((h, i) => (
              <th key={h} className={`border-b border-divider py-3 font-semibold ${i === 0 ? "px-5 text-left" : "pr-5 text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {future.map((d, i) => {
            const bal = (d.precip ?? 0) - (d.et0 ?? 0);
            const sky = skyOf(d);
            return (
              <motion.tr
                key={d.date}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
                className="transition-colors hover:bg-neutral-100"
              >
                <td className="border-b border-divider px-5 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <span style={{ color: sky.color }}>
                      <Icon name={sky.icon} size={15} />
                    </span>
                    <span className="font-medium">{weekday(d.date)}</span>
                    <span className="text-muted">{fmtDay(d.date)}</span>
                  </span>
                </td>
                <td className="border-b border-divider pr-5 text-right tabular-nums">
                  <span className="flex items-center justify-end gap-2">
                    <span className="h-1.5 w-12 rounded-full bg-neutral-100">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${((d.precip ?? 0) / maxRain) * 100}%`, background: "#2F7FD1" }}
                      />
                    </span>
                    <span className="w-[54px]">{d.precip == null ? "—" : `${d.precip.toFixed(1)} mm`}</span>
                  </span>
                </td>
                <td className="border-b border-divider pr-5 text-right tabular-nums">
                  {d.et0 == null ? "—" : `${d.et0.toFixed(1)} mm`}
                </td>
                <td className="border-b border-divider pr-5 text-right tabular-nums">
                  <span
                    className="rounded-full px-2 py-0.5 text-[12.5px] font-semibold"
                    style={{
                      color: bal < 0 ? ET : RAIN,
                      background: `color-mix(in srgb, ${bal < 0 ? ET : RAIN} 12%, transparent)`,
                    }}
                  >
                    {bal > 0 ? "+" : ""}
                    {bal.toFixed(1)} mm
                  </span>
                </td>
                <td className="border-b border-divider pr-5 text-right tabular-nums text-muted">
                  {d.tmin == null ? "—" : `${d.tmin.toFixed(0)}°C`}
                </td>
                <td className="border-b border-divider pr-5 text-right font-medium tabular-nums">
                  {d.tmax == null ? "—" : `${d.tmax.toFixed(0)}°C`}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

/* ── Loading ─────────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[112px] animate-pulse rounded-panel bg-neutral-100" />
        ))}
      </div>
      <div className="h-[260px] animate-pulse rounded-panel bg-neutral-100" />
      <div className="h-[320px] animate-pulse rounded-panel bg-neutral-100" />
    </div>
  );
}
