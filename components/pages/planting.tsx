"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Bean, LeafyGreen, TreeDeciduous, Wheat, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Panel, PageHeader, Segmented } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { CROPS, station as stationById, stationForSite, type Crop } from "@/lib/climate";
import { useBarHover, HoverReadout, HoverGuide, useElementWidth } from "@/components/ui/chart-hover";
import { Menu, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/dropdown";
import {
  bands,
  cropStatus,
  currentDecade,
  decadeDate,
  decadeLabel,
  DECADES_PER_YEAR,
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
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title="Planting calendar"
        lede={
          <>
            When rain alone is enough for each crop, by sowing date, from {station.coverage.years} years of weather
            at {station.name}. It looks at <strong className="font-semibold text-ink">rain only</strong>, not
            temperature or day length.
          </>
        }
        actions={
          <Segmented
            value={shade}
            onChange={setShade}
            options={[
              { value: "class", label: "Rain level" },
              { value: "establishment", label: "Chance to take" },
              { value: "coverage", label: "Rain covers need" },
            ]}
          />
        }
      />

      {/* ── What is open right now ────────────────────────────────────── */}
      <Panel className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 flex-none place-items-center rounded-[10px]"
            style={{ color: WATER_CLASS.reliable.color, background: "rgb(56 168 138 / 0.14)" }}
          >
            <Icon name="sprout" size={20} strokeWidth={1.8} />
          </span>
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold">Good to sow now</span>
            <span className="text-[12.5px] text-muted">Period starting {decadeLabel(today)}</span>
          </span>
        </div>
        {openNow.length ? (
          <div className="flex flex-wrap gap-2">
            {openNow.map(({ crop, status }) => (
              <button
                key={crop.id}
                onClick={() => setSelected(crop.id)}
                className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] transition-colors hover:brightness-110"
                style={{ background: "rgb(56 168 138 / 0.14)" }}
              >
                {crop.name}
                <span className="text-[12px] text-muted">
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
        <div className="min-w-[900px]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 pt-5">
            <span className="flex flex-col gap-0.5">
              <span className="text-[16px] font-semibold">Season calendar</span>
              <span className="text-[13px] text-muted">September to August &middot; click a crop for details</span>
            </span>
            <span className="flex flex-wrap gap-2">
              {(Object.keys(WATER_CLASS) as (keyof typeof WATER_CLASS)[]).map((k) => (
                <span
                  key={k}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px]"
                  style={{ background: `color-mix(in srgb, ${WATER_CLASS[k].color} 12%, transparent)` }}
                >
                  <span className="size-2.5 rounded-full" style={{ background: WATER_CLASS[k].color }} />
                  {WATER_CLASS[k].label}
                </span>
              ))}
              <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-[12.5px]">
                <span className="h-2.5 w-4 rounded-full border-2 border-ink/70" />
                Usual sowing month
              </span>
            </span>
          </div>

          <div className="relative">
            {/* Alternate months are shaded, all the way down the rows. */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 grid"
              style={{ left: LABEL_W, gridTemplateColumns: `repeat(${DECADES_PER_YEAR}, 1fr)` }}
            >
              {months.map((m, i) => (
                <span
                  key={`${m.label}-${i}`}
                  className={i % 2 ? "" : "bg-neutral-100"}
                  style={{ gridColumn: `span ${m.span}`, opacity: 0.6 }}
                />
              ))}
            </div>

            {/* Month ruler, with today pinned on it */}
            <div className="relative grid" style={{ gridTemplateColumns: `${LABEL_W}px repeat(${DECADES_PER_YEAR}, 1fr)` }}>
              <div />
              {months.map((m, i) => (
                <div
                  key={`${m.label}-${i}`}
                  className="px-2.5 pb-2.5 pt-1 text-[12.5px] font-medium text-muted"
                  style={{ gridColumn: `span ${m.span}` }}
                >
                  {m.label.charAt(0) + m.label.slice(1).toLowerCase()}
                </div>
              ))}
            </div>

            {/* One row per crop */}
            <div className="relative flex flex-col gap-1 px-2 pb-2">
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
            </div>

            {/* Today, drawn across every row, labelled at the top */}
            <div
              className="pointer-events-none absolute bottom-2 top-7 flex w-0 flex-col items-center"
              style={{ left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${(todayIndex + 0.5) / DECADES_PER_YEAR})` }}
            >
              <span className="-mt-1 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-bg">
                Today
              </span>
              <span className="w-0.5 flex-1 rounded-full bg-ink opacity-60" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-divider px-5 py-3.5 text-[12.5px] text-muted">
            <span>Today is in the period starting {decadeLabel(today)}.</span>
            <span className="ml-auto text-faint">
              Colours are scored for every 10-day sowing period over {rows[0]?.decades[0]?.years ?? 0} years
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
        <Panel className="flex items-center gap-3 px-5 py-4 text-[13.5px] text-muted">
          <Icon name="info" size={15} />
          Click a crop in the calendar to see its best sowing period and water needs.
        </Panel>
      )}

      <Provenance>
        {station.name}, {station.coverage.days.toLocaleString("en-GB")} days of weather. &ldquo;Chance to take&rdquo; is
        how often at least 20 mm of rain fell in the 3 weeks after sowing.
      </Provenance>
    </div>
  );
}

/* ── A crop row ──────────────────────────────────────────────────────── */

const LABEL_W = 232;

/**
 * Crops are drawn by family with Lucide icons: no maintained icon set has a
 * tomato, garlic, potato, olive or lentil, and a family icon beside the crop
 * name reads cleaner than a drawing of each. The tint tells the families apart.
 */
const FAMILY = {
  cereal: { Icon: Wheat, tint: "#C9962E" },
  legume: { Icon: Bean, tint: "#38A88A" },
  vegetable: { Icon: LeafyGreen, tint: "#8E7CC3" },
  tree: { Icon: TreeDeciduous, tint: "#6F9A4E" },
} satisfies Record<string, { Icon: LucideIcon; tint: string }>;

const CROP_FAMILY: Record<string, keyof typeof FAMILY> = {
  "tomate-de-saison": "vegetable",
  garlic: "vegetable",
  "pomme-de-terre": "vegetable",
  barley: "cereal",
  oats: "cereal",
  "ble-dur": "cereal",
  lentil: "legume",
  feve: "legume",
  olivier: "tree",
};

const MONTH_NAME = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
  const look = FAMILY[CROP_FAMILY[crop.id] ?? "vegetable"];

  /**
   * The crop table names a sowing MONTH, which covers three ten-day periods.
   * Marking one of them implied a precision the source does not have, so the
   * whole month is outlined on the bar.
   */
  const statedSpan = React.useMemo(() => {
    const hits = order
      .map((dec, i) => ({ i, month: decadeDate(dec).getUTCMonth() }))
      .filter((x) => x.month === crop.plantingMonth - 1)
      .map((x) => x.i);
    if (!hits.length) return null;
    return { start: Math.min(...hits), span: Math.max(...hits) - Math.min(...hits) + 1 };
  }, [order, crop.plantingMonth]);

  const pct = (i: number) => `${(i / DECADES_PER_YEAR) * 100}%`;

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className="grid w-full items-center rounded-[14px] text-left transition-colors hover:bg-neutral-100"
      style={{
        gridTemplateColumns: `${LABEL_W - 8}px 1fr`,
        background: selected ? "var(--ap-accent-100)" : undefined,
        boxShadow: selected ? "inset 0 0 0 1.5px color-mix(in srgb, var(--ap-accent) 60%, transparent)" : undefined,
      }}
    >
      <span className="flex items-center gap-3 px-3 py-2.5">
        <span
          className="grid size-11 flex-none place-items-center rounded-[12px]"
          style={{ color: look.tint, background: `color-mix(in srgb, ${look.tint} 15%, transparent)` }}
        >
          <look.Icon size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[15px] font-semibold leading-tight">{crop.name}</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[12px] leading-none">
            {openNow ? (
              <span className="rounded-full px-2 py-[3px] font-semibold" style={{ color: "#2E8C72", background: "rgb(56 168 138 / 0.16)" }}>
                Sow now
              </span>
            ) : (
              <span className="rounded-full bg-neutral-100 px-2 py-[3px] text-muted">
                {waitDays == null ? "Rain never enough" : `In ${waitDays} days`}
              </span>
            )}
            <span className="text-faint">usually {MONTH_NAME[crop.plantingMonth - 1].slice(0, 3)}</span>
          </span>
        </span>
      </span>

      {/* One continuous track; each run is a segment of it. */}
      <span className="relative mr-1 h-7">
        <span className="absolute inset-0 flex overflow-hidden rounded-full bg-neutral-100">
          {runs.map((run, k) => {
            const cls = WATER_CLASS[run.water];
            const value =
              shade === "establishment"
                ? run.first.establishmentProb
                : shade === "coverage"
                  ? run.first.rainfedCoverage
                  : 1;
            // Marginal runs are long; kept quieter so the reliable windows lead.
            const strength =
              shade === "class" ? (run.water === "marginal" ? 38 : 68) : Math.round(20 + value * 70);
            return (
              <motion.span
                key={`${run.water}-${run.start}`}
                title={bandTitle(crop, run)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: run.start * 0.006 }}
                className="absolute inset-y-0"
                style={{
                  left: pct(run.start),
                  width: pct(run.span),
                  background: `color-mix(in srgb, ${cls.color} ${strength}%, transparent)`,
                  // A hairline of the panel between runs keeps the joins crisp.
                  boxShadow: k > 0 ? "inset 2px 0 0 var(--ap-surface)" : undefined,
                }}
              />
            );
          })}
        </span>

        {statedSpan && (
          <span
            title={`Usually sown in ${MONTH_NAME[crop.plantingMonth - 1]}`}
            className="pointer-events-none absolute -inset-y-[3px] rounded-full border-2"
            style={{
              left: `calc(${pct(statedSpan.start)} - 1px)`,
              width: `calc(${pct(statedSpan.span)} + 2px)`,
              borderColor: "color-mix(in srgb, var(--ap-text) 70%, transparent)",
            }}
          />
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
      <Panel className="flex flex-col gap-3.5 px-5 py-5">
        <span className="text-[13px] text-muted">{crop.name}: when rain is enough</span>
        {window ? (
          <>
            <span className="text-[clamp(22px,2.6vw,28px)] font-semibold leading-none">
              {decadeLabel(window.startDecade)}
              <span className="text-muted"> &rarr; </span>
              {decadeLabel((window.endDecade + 1) % DECADES_PER_YEAR)}
            </span>
            <span className="text-[13px] text-muted">
              {window.days} days open
              {window.runs > 1 && ` · longest of ${window.runs} windows`}
            </span>
          </>
        ) : (
          <span className="text-[22px] font-semibold leading-none text-muted">
            Never rain-reliable here
          </span>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              ["Chance to take †", `${(best.establishmentProb * 100).toFixed(0)}%`],
              ["Rain covers need", `${(best.rainfedCoverage * 100).toFixed(0)}%`],
              ["Rain over the season", `${best.rainMm.toFixed(0)} mm`],
              ["Crop water need", `${best.etcMm.toFixed(0)} mm`],
              ["Days above 35°C", best.heatDays.toFixed(1)],
              ["Days below 0°C", best.frostDays.toFixed(2)],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
              <span className="text-[12.5px] text-muted">{k}</span>
              <span className="text-[17px] font-semibold tabular-nums">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 text-[12px] leading-[1.45] text-faint">
          <span>Figures are for the best period in the window, {decadeLabel(best.decade)}.</span>
          <span>
            &dagger; Depends on the rain after sowing, so it is the same for every crop sown on the same date.
          </span>
          <span>Heat and frost days are shown but do not change the calendar colours.</span>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-4 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-[16px] font-semibold">
              {curve === "kc" ? "Crop growth stages" : "Daily water need"}
            </span>
            <span className="text-[13px] text-muted">
              {curve === "kc" ? (
                <>
                  Crop coefficient (K<sub>c</sub>) from the crop table
                </>
              ) : (
                "How much water the crop uses each day, against the rain"
              )}
            </span>
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
                { value: "kc", label: "Stages" },
                { value: "etc", label: "Water need" },
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
              <span className="font-semibold tabular-nums">
                {days} days{kc != null && ` · Kc ${kc.toFixed(2)}`}
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
        <MenuTrigger className="h-8 px-3 text-[12.5px]">
          Sow {decadeLabel(value)}
          <Icon name="down" size={12} />
        </MenuTrigger>
      }
    >
      <MenuLabel>Sowing period</MenuLabel>
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
        <MenuTrigger className="h-8 px-3 text-[12.5px]">
          {value == null ? "30-year average" : `${value}–${String(value + 1).slice(2)}`}
          <Icon name="down" size={12} />
        </MenuTrigger>
      }
    >
      <MenuLabel>Season</MenuLabel>
      <MenuItem onSelect={() => onChange(null)} hint={value == null ? "✓" : undefined}>
        30-year average
      </MenuItem>
      <MenuLabel>One season ({years.length})</MenuLabel>
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

  const [ref, w] = useElementWidth<HTMLDivElement>(520);
  const h = 190;
  const pad = { l: 34, r: 10, t: 10, b: 24 };
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
      <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
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

        <svg width={w} height={h} className="block">
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
          <path d={line((d) => d.etc)} fill="none" style={{ stroke: "var(--ap-accent)" }} strokeWidth={2} />

          <HoverGuide hover={hover} left={pad.l} right={pad.r} width={w} top={pad.t} bottom={y(0)} />

          <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
            <text x={pad.l - 6} y={y(max / 1.1) + 4} textAnchor="end">{(max / 1.1).toFixed(1)}</text>
            <text x={pad.l - 6} y={y(0) + 4} textAnchor="end">0</text>
            <text x={pad.l} y={h - 6}>Sown {decadeLabel(sowDecade)}</text>
            <text x={w - pad.r} y={h - 6} textAnchor="end">Day {crop.totalDays}</text>
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12.5px] text-muted">
        <span className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded-full" style={{ background: "var(--ap-accent)" }} />
            Crop need, mm/day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded-full" style={{ background: "var(--ap-muted)" }} />
            Reference (ET<sub>0</sub>)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: "var(--ap-teal)", opacity: 0.6 }} />
            Rain
          </span>
        </span>
        <span className="flex gap-3.5">
          <span>
            Need <span className="font-semibold text-ink">{total.toFixed(0)} mm</span>
          </span>
          <span>
            Rain <span className="font-semibold text-ink">{rain.toFixed(0)} mm</span>
          </span>
          <span>
            Shortfall{" "}
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
  const [ref, w] = useElementWidth<HTMLDivElement>(520);
  const h = 120;
  const pad = { l: 30, r: 8, t: 8, b: 22 };
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
    <div ref={ref}>
    <svg width={w} height={h} className="block">
      <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.08 }}>
        <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} />
        <line x1={pad.l} x2={w - pad.r} y1={y(1)} y2={y(1)} />
      </g>
      <path
        d={`${d}L${x(totalDays).toFixed(1)} ${y(0).toFixed(1)}L${x(0).toFixed(1)} ${y(0).toFixed(1)}Z`}
        fill="var(--ap-accent)"
        fillOpacity={0.12}
      />
      <path d={d} fill="none" style={{ stroke: "var(--ap-accent)" }} strokeWidth={2} strokeLinejoin="round" />
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
      <g style={{ fill: "var(--ap-muted)" }} fontSize={12}>
        <text x={pad.l - 6} y={y(1) + 4} textAnchor="end">1.0</text>
        <text x={pad.l - 6} y={y(0) + 4} textAnchor="end">0</text>
        <text x={pad.l} y={h - 6}>Sowing</text>
        <text x={w - pad.r} y={h - 6} textAnchor="end">Day {totalDays}</text>
      </g>
    </svg>
    </div>
  );
}

/** Fallback when a crop has no rain-reliable window at all. */
function bestPeriodOf(decades: DecadeSuitability[]): DecadeSuitability {
  return [...decades].sort((a, b) => periodScore(b) - periodScore(a))[0];
}
