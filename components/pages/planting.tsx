"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Panel, PageHeader, Segmented } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { CROPS, station as stationById, stationForSite, type Crop } from "@/lib/climate";
import { useBarHover, HoverReadout, HoverGuide } from "@/components/ui/chart-hover";
import { Menu, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/dropdown";
import {
  bands,
  cropStatus,
  currentDecade,
  decadeDate,
  decadeLabel,
  DECADES_PER_YEAR,
  MONTH_ABBR,
  periodScore,
  cycleYears,
  etcCurve,
  statedSowDecade,
  reliableWindow,
  seasonMonths,
  seasonOrder,
  suitability,
  WATER_CLASS,
  type DecadeSuitability,
} from "@/lib/metrics";

/**
 * The whole season at once: every crop as a row, ten-day periods across.
 *
 * Reading one crop at a time hid the question the page exists to answer —
 * what can go in the ground now, and what should wait. All nine crops share
 * one time axis so the comparison is immediate, and the year starts in
 * September so autumn sowings are not split across the two ends of the chart.
 *
 * The bands score RAINFALL ADEQUACY ONLY, computed by replaying 30 years of
 * daily weather through each crop's FAO-56 Kc curve. The record carries no
 * base temperature or photoperiod per crop, so it cannot rank a warm-season
 * or perennial crop on what actually gates its sowing date; the agronomist's
 * stated sowing month is marked on each row instead.
 */

type Shade = "class" | "establishment" | "coverage";

export function PagePlanting() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [shade, setShade] = React.useState<Shade>("class");

  const months = React.useMemo(() => seasonMonths(), []);
  const order = React.useMemo(() => seasonOrder(), []);
  const today = currentDecade();
  const todayIndex = order.indexOf(today);

  const rows = React.useMemo(
    () =>
      CROPS.map((crop) => ({
        crop,
        decades: suitability(station.id, crop.id),
        status: cropStatus(station.id, crop.id),
      })),
    [station.id],
  );

  const openNow = rows.filter((r) => r.status.openNow);
  const soonest = Math.min(...rows.map((r) => r.status.waitDays ?? Number.POSITIVE_INFINITY));
  const current = selected ? rows.find((r) => r.crop.id === selected) : null;

  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={
          <>
            ANALYSIS &middot; SOWING WATER ADEQUACY &middot; {station.name.toUpperCase()} &middot;{" "}
            {station.coverage.years} YEARS
          </>
        }
        title="Planting calendar"
        lede={
          <>
            Where rain alone can carry each crop, by sowing date. Bands score{" "}
            <strong className="font-medium text-ink">rainfall adequacy only</strong> &mdash; temperature and day
            length are not in the record, so this cannot say when a warm-season crop belongs in the ground.
          </>
        }
        actions={
          <Segmented
            value={shade}
            onChange={setShade}
            options={[
              { value: "class", label: "Bands" },
              { value: "establishment", label: "Establishment" },
              { value: "coverage", label: "Coverage" },
            ]}
          />
        }
      />

      {/* ── What is open right now ────────────────────────────────────── */}
      <Panel className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="size-2 flex-none rounded-full" style={{ background: WATER_CLASS.reliable.color }} />
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
            OPEN NOW &middot; {decadeLabel(today)}
          </span>
        </div>
        {openNow.length ? (
          <div className="flex flex-wrap gap-2">
            {openNow.map(({ crop, status }) => (
              <button
                key={crop.id}
                onClick={() => setSelected(crop.id)}
                className="flex items-center gap-2 rounded-inset border px-2.5 py-1 text-[13px] transition-colors hover:bg-neutral-100"
                style={{ borderColor: "rgb(56 168 138 / 0.45)", background: "rgb(56 168 138 / 0.10)" }}
              >
                <Icon name="sprout" size={13} />
                {crop.name}
                <span className="font-mono text-[10.5px] text-muted">
                  {((status.here?.establishmentProb ?? 0) * 100).toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[13px] text-muted">
            No crop reaches the rain-reliable threshold this period
            {Number.isFinite(soonest) && <> &mdash; the next one opens in {soonest} days</>}.
          </span>
        )}
      </Panel>

      {/* ── Season calendar ───────────────────────────────────────────── */}
      <Panel className="flex flex-col overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3.5">
            <span className="font-heading text-lg font-semibold">Season calendar &middot; Sep &rarr; Aug</span>
            <span className="flex flex-wrap gap-4 font-mono text-[10.5px] text-muted">
              {(Object.keys(WATER_CLASS) as (keyof typeof WATER_CLASS)[]).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-4 rounded-[2px]"
                    style={{ background: WATER_CLASS[k].fill, border: `1px solid ${WATER_CLASS[k].color}` }}
                  />
                  {WATER_CLASS[k].label}
                </span>
              ))}
            </span>
          </div>

          {/* Month ruler */}
          <div
            className="grid border-b border-divider"
            style={{ gridTemplateColumns: `168px repeat(${DECADES_PER_YEAR}, 1fr)` }}
          >
            <div />
            {months.map((m, i) => (
              <div
                key={`${m.label}-${i}`}
                className="border-l border-divider px-2 py-2 font-mono text-[10.5px] tracking-[0.08em] text-muted"
                style={{ gridColumn: `span ${m.span}` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* One row per crop */}
          <div className="relative">
            {rows.map(({ crop, decades, status }) => (
              <CropRow
                key={crop.id}
                crop={crop}
                decades={decades}
                shade={shade}
                selected={selected === crop.id}
                onSelect={() => setSelected(selected === crop.id ? null : crop.id)}
                waitDays={status.waitDays}
                openNow={status.openNow}
              />
            ))}

            {/* Today, drawn across every row */}
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-ink opacity-55"
              style={{
                left: `calc(168px + (100% - 168px) * ${(todayIndex + 0.5) / DECADES_PER_YEAR})`,
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 font-mono text-[10.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-px bg-ink opacity-55" />
              today &middot; {decadeLabel(today)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex h-[6px] w-5 items-end">
                <span className="h-[6px] w-px bg-accent" />
                <span className="h-px flex-1 bg-accent" />
                <span className="h-[6px] w-px bg-accent" />
              </span>
              sowing month recorded in the crop table
            </span>
            <span className="ml-auto">
              {DECADES_PER_YEAR} ten-day periods &middot; {rows[0]?.decades[0]?.years ?? 0} years each
            </span>
          </div>
        </div>
      </Panel>

      {/* ── Detail for the selected crop ──────────────────────────────── */}
      {current ? (
        <CropDetail
          crop={current.crop}
          decades={current.decades}
          stationId={station.id}
          stationYears={station.coverage.years}
        />
      ) : (
        <Panel className="flex items-center gap-3 px-5 py-4 text-[13px] text-muted">
          <Icon name="info" size={14} />
          Select a crop row for its coefficients, its best period and how the bands were computed.
        </Panel>
      )}

      <Provenance>
        {station.name} &middot; {station.coverage.days.toLocaleString("en-GB")} daily observations &middot;
        establishment = P(&ge;20 mm in the 21 days after sowing)
      </Provenance>
    </div>
  );
}

/* ── A crop row ──────────────────────────────────────────────────────── */

function CropRow({
  crop,
  decades,
  shade,
  selected,
  onSelect,
  waitDays,
  openNow,
}: {
  crop: Crop;
  decades: DecadeSuitability[];
  shade: Shade;
  selected: boolean;
  onSelect: () => void;
  waitDays: number | null;
  openNow: boolean;
}) {
  const runs = React.useMemo(() => bands(decades), [decades]);
  const order = React.useMemo(() => seasonOrder(), []);

  /**
   * The crop table names a sowing MONTH, which covers three ten-day periods.
   * Marking one of them with a dot implied a precision the source does not
   * have, so it is drawn as a bracket under the row spanning the whole month.
   */
  const statedSpan = React.useMemo(() => {
    const hits = order
      .map((dec, i) => ({ i, month: decadeDate(dec).getUTCMonth() }))
      .filter((x) => x.month === crop.plantingMonth - 1)
      .map((x) => x.i);
    if (!hits.length) return null;
    return { start: Math.min(...hits), span: Math.max(...hits) - Math.min(...hits) + 1 };
  }, [order, crop.plantingMonth]);

  return (
    <button
      onClick={onSelect}
      className="grid w-full border-b border-divider text-left transition-colors last:border-b-0 hover:bg-neutral-100"
      style={{
        gridTemplateColumns: `168px repeat(${DECADES_PER_YEAR}, 1fr)`,
        background: selected ? "var(--ap-neutral-100)" : "transparent",
        boxShadow: selected ? "inset 2px 0 0 var(--ap-accent)" : undefined,
      }}
    >
      <span className="flex h-[52px] items-center gap-2.5 px-5">
        <span style={{ color: openNow ? WATER_CLASS.reliable.color : "var(--ap-muted)" }}>
          <Icon name="sprout" size={15} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13.5px]" style={{ fontWeight: selected ? 600 : 400 }}>
            {crop.name}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
            <span style={{ color: openNow ? WATER_CLASS.reliable.color : undefined }}>
              {openNow ? "open now" : waitDays == null ? "never rain-reliable" : `next in ${waitDays} d`}
            </span>
            <span className="text-faint">&middot;</span>
            <span className="text-faint">sow {MONTH_ABBR[crop.plantingMonth - 1]}</span>
          </span>
        </span>
      </span>

      {/* Column rules sit under the bands so the grid stays readable. */}
      <span className="relative col-span-full col-start-2 h-[52px]">
        <span
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${DECADES_PER_YEAR}, 1fr)` }}
        >
          {order.map((dec, i) => (
            <span key={dec} className={i % 3 === 0 ? "border-l border-divider" : ""} />
          ))}
        </span>

        {runs.map((run) => {
          const cls = WATER_CLASS[run.water];
          const value =
            shade === "establishment"
              ? run.first.establishmentProb
              : shade === "coverage"
                ? run.first.rainfedCoverage
                : 1;
          const background =
            shade === "class"
              ? cls.fill
              : `color-mix(in srgb, ${cls.color} ${Math.round(value * 90)}%, transparent)`;
          return (
            <motion.span
              key={`${run.water}-${run.start}`}
              title={bandTitle(crop, run)}
              initial={{ opacity: 0, scaleX: 0.96 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.28, delay: run.start * 0.004, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-y-3 rounded-[3px]"
              style={{
                left: `${(run.start / DECADES_PER_YEAR) * 100}%`,
                width: `${(run.span / DECADES_PER_YEAR) * 100}%`,
                background,
                border: `1px solid ${cls.color}`,
                transformOrigin: "left center",
              }}
            />
          );
        })}

        {statedSpan && (
          <span
            title={`Crop table: sow in ${MONTH_ABBR[crop.plantingMonth - 1]}`}
            className="pointer-events-none absolute bottom-[5px] flex h-[6px] items-end"
            style={{
              left: `${(statedSpan.start / DECADES_PER_YEAR) * 100}%`,
              width: `${(statedSpan.span / DECADES_PER_YEAR) * 100}%`,
            }}
          >
            <span className="h-[6px] w-px flex-none bg-accent" />
            <span className="h-px flex-1 bg-accent" />
            <span className="h-[6px] w-px flex-none bg-accent" />
          </span>
        )}
      </span>
    </button>
  );
}

function bandTitle(crop: Crop, run: ReturnType<typeof bands>[number]) {
  const d = run.first;
  return (
    `${crop.name} — ${WATER_CLASS[run.water].label}\n` +
    `from ${decadeLabel(d.decade)}, ${run.span * 10} days\n` +
    `establishment ${(d.establishmentProb * 100).toFixed(0)}%\n` +
    `rainfed coverage ${(d.rainfedCoverage * 100).toFixed(0)}%\n` +
    `cycle rain ${d.rainMm.toFixed(0)} mm vs ETc ${d.etcMm.toFixed(0)} mm`
  );
}

/* ── Detail ──────────────────────────────────────────────────────────── */

function CropDetail({
  crop,
  decades,
  stationId,
  stationYears,
}: {
  crop: Crop;
  decades: DecadeSuitability[];
  stationId: string;
  stationYears: number;
}) {
  const window = reliableWindow(stationId, crop.id);
  const best = window?.peak ?? bestPeriodOf(decades);
  const [curve, setCurve] = React.useState<"kc" | "etc">("kc");
  /** null = the 30-year day-of-year mean; a number replays that season. */
  const [year, setYear] = React.useState<number | null>(null);
  // Defaults to the crop table's stated month rather than the highest-scoring
  // period: periodScore is dominated by establishmentProb, which has no crop
  // term and peaks at 28 October for everything.
  const [sow, setSow] = React.useState(() => statedSowDecade(crop));
  React.useEffect(() => {
    setSow(statedSowDecade(crop));
    setYear(null);
  }, [crop]);

  return (
    <motion.div
      key={crop.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <Panel className="flex flex-col gap-3.5 px-5 py-4.5">
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
          {crop.name.toUpperCase()} &middot; RAIN-RELIABLE WINDOW
        </span>
        {window ? (
          <>
            <span className="font-heading text-[clamp(22px,2.6vw,30px)] font-semibold leading-none">
              {decadeLabel(window.startDecade)}
              <span className="text-muted"> &rarr; </span>
              {decadeLabel((window.endDecade + 1) % DECADES_PER_YEAR)}
            </span>
            <span className="font-mono text-[11.5px] text-muted">
              {window.days} days open
              {window.runs > 1 && ` · longest of ${window.runs} windows`}
            </span>
          </>
        ) : (
          <span className="font-heading text-[22px] font-semibold leading-none text-muted">
            Never rain-reliable here
          </span>
        )}
        <div className="grid grid-cols-2 border-l border-t border-divider">
          {(
            [
              ["ESTABLISHMENT †", `${(best.establishmentProb * 100).toFixed(0)}%`],
              ["RAINFED COVERAGE", `${(best.rainfedCoverage * 100).toFixed(0)}%`],
              ["CYCLE RAIN", `${best.rainMm.toFixed(0)} mm`],
              ["CYCLE ETc", `${best.etcMm.toFixed(0)} mm`],
              ["HEAT DAYS >35°C", best.heatDays.toFixed(1)],
              ["FROST DAYS <0°C", best.frostDays.toFixed(2)],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 border-b border-r border-divider px-3 py-2.5">
              <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</span>
              <span className="font-mono text-[15px]">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 font-mono text-[10.5px] leading-[1.45] text-faint">
          <span>figures are for the best period inside the window, {decadeLabel(best.decade)}</span>
          <span>
            &dagger; establishment counts rain after sowing, so it depends on the date, not the crop &mdash; it
            reads the same across crops sown together
          </span>
          <span>heat and frost are counted and shown, but do not set the band</span>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-4 px-5 py-4.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-accent">
            {curve === "kc" ? <>COEFFICIENTS &middot; FROM THE CROP TABLE</> : <>WATER DEMAND &middot; DAILY</>}
          </span>
          <div className="flex items-center gap-2">
            {curve === "etc" && (
              <>
                <SowPicker crop={crop} value={sow} onChange={setSow} />
                <YearPicker
                  stationId={stationId}
                  crop={crop}
                  sowDecade={sow}
                  value={year}
                  onChange={setYear}
                />
              </>
            )}
            <Segmented
              size="sm"
              value={curve}
              onChange={setCurve}
              options={[
                { value: "kc", label: <>K<sub>c</sub></> },
                { value: "etc", label: <>ET<sub>c</sub></> },
              ]}
            />
          </div>
        </div>

        {curve === "kc" ? (
          <KcCurve crop={crop} />
        ) : (
          <EtcCurve crop={crop} stationId={stationId} sowDecade={sow} year={year} />
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-4">
          {(
            [
              ["Initial", crop.lIni, crop.kcIni],
              ["Development", crop.lDev, null],
              ["Mid-season", crop.lMid, crop.kcMid],
              ["Late", crop.lLate, crop.kcEnd],
            ] as const
          ).map(([label, days, kc]) => (
            <div key={label} className="flex flex-col">
              <span className="text-muted">{label}</span>
              <span className="font-mono">
                {days} d{kc != null && ` · Kc ${kc.toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>

        <p className="m-0 border-t border-divider pt-3 text-[12.5px] leading-[1.55] text-muted">
          {curve === "kc" ? (
            <>
              For every sowing period, {stationYears} years are replayed day by day: this K<sub>c</sub> curve times
              the measured ET<sub>0</sub> gives the crop&rsquo;s water demand, and it is compared against the rain
              that actually fell.
            </>
          ) : (
            year == null ? (
              <>
                K<sub>c</sub> times the day-of-year mean ET<sub>0</sub> over {stationYears} years, for a cycle sown{" "}
                {decadeLabel(sow)}
                {sow === statedSowDecade(crop) && <> &mdash; the crop table&rsquo;s stated month</>}. Expected demand
                for that sowing date, not one particular season.
              </>
            ) : (
              <>
                K<sub>c</sub> times the ET<sub>0</sub> measured from {decadeLabel(sow)} {year}. Rainfall is what
                actually fell that season.
              </>
            )
          )}
        </p>
      </Panel>
    </motion.div>
  );
}

/** Picks the sowing period the ETc curve is drawn for. */
function SowPicker({
  crop,
  value,
  onChange,
}: {
  crop: Crop;
  value: number;
  onChange: (v: number) => void;
}) {
  const stated = statedSowDecade(crop);
  return (
    <Menu
      align="end"
      className="max-h-[320px] w-[168px] overflow-y-auto"
      trigger={
        <MenuTrigger className="h-7 px-2 font-mono text-[11px]">
          sow {decadeLabel(value)}
          <Icon name="down" size={12} />
        </MenuTrigger>
      }
    >
      <MenuLabel>SOWING PERIOD</MenuLabel>
      {seasonOrder().map((dec) => (
        <MenuItem
          key={dec}
          onSelect={() => onChange(dec)}
          hint={value === dec ? "✓" : dec === stated ? "table" : undefined}
        >
          {decadeLabel(dec)}
        </MenuItem>
      ))}
    </Menu>
  );
}

/** Picks the 30-year mean or one measured season for the ETc curve. */
function YearPicker({
  stationId,
  crop,
  sowDecade,
  value,
  onChange,
}: {
  stationId: string;
  crop: Crop;
  sowDecade: number;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const years = React.useMemo(
    () => cycleYears(stationById(stationId), crop, sowDecade),
    [stationId, crop, sowDecade],
  );

  return (
    <Menu
      align="end"
      className="max-h-[320px] w-[150px] overflow-y-auto"
      trigger={
        <MenuTrigger className="h-7 px-2 font-mono text-[11px]">
          {value == null ? "30-yr mean" : `${value}–${String(value + 1).slice(2)}`}
          <Icon name="down" size={12} />
        </MenuTrigger>
      }
    >
      <MenuLabel>SEASON</MenuLabel>
      <MenuItem onSelect={() => onChange(null)} hint={value == null ? "✓" : undefined}>
        30-yr mean
      </MenuItem>
      <MenuLabel>MEASURED &middot; {years.length} SEASONS</MenuLabel>
      {years
        .slice()
        .reverse()
        .map((y) => (
          <MenuItem key={y} onSelect={() => onChange(y)} hint={value === y ? "✓" : undefined}>
            {y}&ndash;{String(y + 1).slice(2)}
          </MenuItem>
        ))}
    </Menu>
  );
}

/**
 * Daily crop water demand across the cycle: ETc = Kc x ET0.
 *
 * ET0 is the day-of-year mean over the whole record, so the curve reads as
 * the expected demand for this sowing date. Its cycle total agrees with the
 * replayed planting figures to within 0.1%, because both start the cycle on
 * the first day of the ten-day period and use the same Kc curve.
 */
function EtcCurve({
  crop,
  stationId,
  sowDecade,
  year,
}: {
  crop: Crop;
  stationId: string;
  sowDecade: number;
  year: number | null;
}) {
  const days = React.useMemo(
    () => etcCurve(stationById(stationId), crop, sowDecade, year ?? undefined),
    [stationId, crop, sowDecade, year],
  );

  const w = 520;
  const h = 150;
  const pad = { l: 30, r: 10, t: 10, b: 20 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...days.map((d) => Math.max(d.etc, d.et0))) * 1.1 || 1;
  // Rain gets its own scale: daily totals dwarf ET rates, and the point is
  // when it fell against demand, not a like-for-like magnitude comparison.
  const rainMax = Math.max(...days.map((d) => d.precip), 1);
  const barW = Math.max(0.8, innerW / days.length);
  const x = (day: number) => pad.l + (day / (days.length - 1)) * innerW;
  const y = (mm: number) => pad.t + innerH - (mm / max) * innerH;

  const hover = useBarHover(days.length, pad.l, pad.r, w);
  const at = hover.index == null ? null : days[hover.index];

  const line = (f: (d: (typeof days)[number]) => number) =>
    "M" + days.map((d) => `${x(d.day).toFixed(1)} ${y(f(d)).toFixed(1)}`).join("L");

  const total = days[days.length - 1].cumulative;
  const rain = days[days.length - 1].cumulativeRain;
  const stages = [crop.lIni, crop.lIni + crop.lDev, crop.lIni + crop.lDev + crop.lMid];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
        <HoverReadout hover={hover} left={pad.l} right={pad.r} width={w}>
          {at && (
            <>
              day {at.day} &middot;{" "}
              {at.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} &middot; K
              <sub>c</sub> {at.kc.toFixed(2)} &middot; ET<sub>0</sub> {at.et0.toFixed(2)} &middot;{" "}
              <span style={{ color: "var(--ap-accent)" }}>
                ET<sub>c</sub> {at.etc.toFixed(2)} mm
              </span>{" "}
              &middot; rain {at.precip.toFixed(1)} mm &middot; total ET<sub>c</sub>{" "}
              {at.cumulative.toFixed(0)} mm
            </>
          )}
        </HoverReadout>

        <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
          <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * f} y2={pad.t + innerH * f} />
            ))}
          </g>

          {stages.map((day) => (
            <line
              key={day}
              x1={x(day)}
              x2={x(day)}
              y1={pad.t}
              y2={y(0)}
              style={{ stroke: "var(--ap-text)", strokeOpacity: 0.12 }}
              strokeDasharray="2 3"
            />
          ))}

          {days.map((d) =>
            d.precip <= 0 ? null : (
              <rect
                key={d.day}
                x={x(d.day) - barW / 2}
                y={pad.t + innerH - (d.precip / rainMax) * innerH * 0.55}
                width={barW}
                height={(d.precip / rainMax) * innerH * 0.55}
                fill="var(--ap-teal)"
                fillOpacity={hover.index === d.day ? 0.85 : 0.4}
              />
            ),
          )}

          {/* ET0 underneath, so the gap to ETc reads as the crop's own effect. */}
          <path d={line((d) => d.et0)} fill="none" style={{ stroke: "var(--ap-muted)" }} strokeWidth={1} strokeDasharray="3 3" />

          <path
            d={`${line((d) => d.etc)}L${x(days.length - 1).toFixed(1)} ${y(0).toFixed(1)}L${x(0).toFixed(1)} ${y(0).toFixed(1)}Z`}
            fill="var(--ap-accent)"
            fillOpacity={0.12}
          />
          <path d={line((d) => d.etc)} fill="none" style={{ stroke: "var(--ap-accent)" }} strokeWidth={1.75} />

          <HoverGuide hover={hover} left={pad.l} right={pad.r} width={w} top={pad.t} bottom={y(0)} />

          <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9}>
            <text x={pad.l - 5} y={y(max / 1.1) + 3} textAnchor="end">{(max / 1.1).toFixed(1)}</text>
            <text x={pad.l - 5} y={y(0) + 3} textAnchor="end">0</text>
            <text x={pad.l} y={h - 5}>{decadeLabel(sowDecade)}</text>
            <text x={w - pad.r} y={h - 5} textAnchor="end">day {crop.totalDays}</text>
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[10.5px] text-muted">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5" style={{ background: "var(--ap-accent)" }} />
            ET<sub>c</sub> mm/day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5" style={{ background: "var(--ap-muted)" }} />
            ET<sub>0</sub>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2" style={{ background: "var(--ap-teal)", opacity: 0.5 }} />
            rain
          </span>
        </span>
        <span className="flex gap-3">
          <span>
            ET<sub>c</sub> <span className="text-ink">{total.toFixed(0)} mm</span>
          </span>
          <span>
            RAIN <span className="text-ink">{rain.toFixed(0)} mm</span>
          </span>
          <span>
            DEFICIT{" "}
            <span style={{ color: total - rain > 0 ? "#EE8434" : "var(--ap-teal)" }}>
              {Math.max(0, total - rain).toFixed(0)} mm
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}

/** The FAO-56 single-coefficient curve this crop is scored against. */
function KcCurve({ crop }: { crop: Crop }) {
  const { kcIni, kcMid, kcEnd, lIni, lDev, lMid, lLate, totalDays } = crop;
  const w = 520;
  const h = 96;
  const pad = { l: 26, r: 8, t: 8, b: 18 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxKc = Math.max(kcIni, kcMid, kcEnd, 1) * 1.15;
  const x = (day: number) => pad.l + (day / totalDays) * innerW;
  const y = (kc: number) => pad.t + innerH - (kc / maxKc) * innerH;

  const pts: [number, number][] = [
    [0, kcIni],
    [lIni, kcIni],
    [lIni + lDev, kcMid],
    [lIni + lDev + lMid, kcMid],
    [Math.min(totalDays, lIni + lDev + lMid + lLate), kcEnd],
  ];
  const d = "M" + pts.map(([day, kc]) => `${x(day).toFixed(1)} ${y(kc).toFixed(1)}`).join("L");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
      <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
        <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} />
        <line x1={pad.l} x2={w - pad.r} y1={y(1)} y2={y(1)} />
      </g>
      <path
        d={`${d}L${x(totalDays).toFixed(1)} ${y(0).toFixed(1)}L${x(0).toFixed(1)} ${y(0).toFixed(1)}Z`}
        fill="var(--ap-accent)"
        fillOpacity={0.12}
      />
      <path d={d} fill="none" style={{ stroke: "var(--ap-accent)" }} strokeWidth={1.75} />
      {[lIni, lIni + lDev, lIni + lDev + lMid].map((day) => (
        <line
          key={day}
          x1={x(day)}
          x2={x(day)}
          y1={pad.t}
          y2={y(0)}
          style={{ stroke: "var(--ap-text)", strokeOpacity: 0.12 }}
          strokeDasharray="2 3"
        />
      ))}
      <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-muted)" }} fontSize={9}>
        <text x={pad.l - 5} y={y(1) + 3} textAnchor="end">1.0</text>
        <text x={pad.l - 5} y={y(0) + 3} textAnchor="end">0</text>
        <text x={pad.l} y={h - 5}>day 0</text>
        <text x={w - pad.r} y={h - 5} textAnchor="end">day {totalDays}</text>
      </g>
    </svg>
  );
}

/** Fallback when a crop has no rain-reliable window at all. */
function bestPeriodOf(decades: DecadeSuitability[]): DecadeSuitability {
  return [...decades].sort((a, b) => periodScore(b) - periodScore(a))[0];
}
