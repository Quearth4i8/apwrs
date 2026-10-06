"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Wheat } from "lucide-react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { CropImage } from "@/components/crop-visual";
import { ButtonLink, Panel, PageHeader } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { stationForSite, type Station } from "@/lib/climate";
import {
  CALENDAR_CROPS,
  CALENDAR_SOURCE,
  FAMILY_LABEL,
  MONTHS,
  calendarCrop,
  daysBetween,
  monthPos,
  periodLabel,
  posLabel,
  type CalendarCrop,
  type Period,
} from "@/lib/crop-calendar";
import { advise, alternatives, VERDICT, type Advice, type Check, type Level } from "@/lib/advisor";
import { PROFILE_USER, useFieldProfile, type FieldProfile } from "@/lib/field-profile";

/**
 * The planting calendar, one crop at a time: pick a crop, see when it is
 * sown or planted and when it is harvested, then whether it suits this
 * user's field now — and what to plant instead when it does not.
 *
 * The calendar is the FAO Crop Calendar for Tunisia's sub-humid zone
 * (lib/crop-calendar.ts). The advice checks the crop's agronomic
 * requirements against the user's Field Profile (lib/advisor.ts).
 */

const SOW = "#6AB04C";
const HARVEST = "#2E4A62";
const EASE = [0.2, 0.8, 0.2, 1] as const;

export function PagePlanting() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const [cropId, setCropId] = React.useState("wheat-durum");
  const crop = calendarCrop(cropId);
  const { profile, saved } = useFieldProfile(PROFILE_USER, station);
  const [today] = React.useState(() => monthPos());

  const advice = React.useMemo(() => advise(crop, profile, station, today), [crop, profile, station, today]);
  const all = React.useMemo(
    () => Object.fromEntries(CALENDAR_CROPS.map((c) => [c.id, advise(c, profile, station, today)])),
    [profile, station, today],
  );
  const others = React.useMemo(() => alternatives(crop, profile, station, today), [crop, profile, station, today]);

  const pick = (id: string) => {
    setCropId(id);
    document.getElementById("crop-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title="Planting calendar"
        lede="Sowing and harvest periods for Tunisia's sub-humid zone, and whether each crop suits your field."
        actions={
          <ButtonLink href="/app/profile">
            <Icon name="pencil" size={14} />
            Field profile
          </ButtonLink>
        }
      />

      {!saved && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 rounded-panel border border-[color-mix(in_srgb,var(--ap-accent)_35%,transparent)] bg-accent-100 px-4 py-3 text-[13.5px]"
        >
          <Icon name="info" size={16} />
          <span className="flex-1">
            The advice uses default values: {station.name}&apos;s 30-year climate and a typical loam. Set your own field for
            advice that fits it.
          </span>
          <Link href="/app/profile" className="font-semibold text-accent no-underline hover:underline">
            Set up field profile &rarr;
          </Link>
        </motion.div>
      )}

      {/* ── Crop picker ───────────────────────────────────────────────── */}
      <Panel className="flex flex-col gap-4 px-5 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-lg font-semibold">Choose a crop</span>
          <span className="flex items-center gap-3 text-[12.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: SOW }} />
              Sowing open now
            </span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {CALENDAR_CROPS.map((c, i) => (
            <CropCard key={c.id} crop={c} advice={all[c.id]} selected={c.id === cropId} onPick={() => setCropId(c.id)} index={i} />
          ))}
        </div>
      </Panel>

      {/* ── Calendar for the crop ─────────────────────────────────────── */}
      <div id="crop-calendar" className="scroll-mt-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={crop.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="flex flex-col gap-6"
          >
            <CalendarPanel crop={crop} today={today} season={advice.seasonMonths} />
            <AdvicePanel advice={advice} others={others} profile={profile} station={station} onPick={pick} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Crop card ───────────────────────────────────────────────────────── */

function CropCard({
  crop,
  advice,
  selected,
  onPick,
  index,
}: {
  crop: CalendarCrop;
  advice: Advice;
  selected: boolean;
  onPick: () => void;
  index: number;
}) {
  const v = VERDICT[advice.verdict];
  return (
    <motion.button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: EASE }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex flex-col overflow-hidden rounded-[16px] border bg-surface text-left outline-none transition-[border-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--ap-accent)] ${
        selected
          ? "border-[var(--ap-accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--ap-accent)_22%,transparent)]"
          : "border-divider hover:border-[color-mix(in_srgb,var(--ap-accent)_45%,transparent)] hover:shadow-pop"
      }`}
    >
      <CropImage crop={crop} className="aspect-[4/3] w-full" />

      {/* Status over the photo, legible on any image. */}
      {advice.openNow && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
          <span className="size-1.5 rounded-full" style={{ background: SOW }} />
          Sow now
        </span>
      )}
      {selected && (
        <motion.span
          layoutId="crop-check"
          className="absolute right-2 top-2 grid size-6 place-items-center rounded-full text-white shadow"
          style={{ background: "var(--ap-accent)" }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        >
          <Icon name="check" size={14} strokeWidth={2.5} />
        </motion.span>
      )}

      <span className="flex flex-col gap-0.5 px-3 py-2.5">
        <span className="truncate text-[14px] font-semibold">{crop.name}</span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted">
          <span className="size-1.5 flex-none rounded-full" style={{ background: v.color }} />
          <span className="truncate">{FAMILY_LABEL[crop.family]}</span>
        </span>
      </span>
    </motion.button>
  );
}

/* ── Calendar ────────────────────────────────────────────────────────── */

function CalendarPanel({ crop, today, season }: { crop: CalendarCrop; today: number; season: number[] }) {
  const lanes: { label: string; color: string; periods: Period[] }[] = [
    { label: "Sowing / planting", color: SOW, periods: crop.sow },
    { label: "Harvesting", color: HARVEST, periods: crop.harvest },
  ];

  return (
    <Panel className="flex flex-col gap-5 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <CropImage crop={crop} className="size-14 flex-none rounded-full ring-2 ring-[var(--ap-surface)]" iconSize={22} />
          <span className="flex flex-col gap-0.5">
            <span className="text-[20px] font-semibold leading-tight">{crop.name}</span>
            <span className="text-[13px] text-muted">
              {crop.nameFr} · {FAMILY_LABEL[crop.family]}
            </span>
          </span>
        </div>
        <span className="flex flex-wrap items-center gap-4 text-[12.5px] text-muted">
          {lanes.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-[3px]" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded-[3px] bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--ap-accent)_35%,transparent)_0_3px,transparent_3px_6px)]" />
            Growing season
          </span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Month header */}
          <div className="grid grid-cols-[150px_repeat(12,minmax(0,1fr))] text-[12px] text-muted">
            <span />
            {MONTHS.map((m, i) => (
              <span
                key={m}
                className={`border-l border-divider px-2 pb-2 ${Math.floor(today) === i ? "font-semibold text-ink" : ""}`}
              >
                {m.slice(0, 3)}
              </span>
            ))}
          </div>

          <div className="relative">
            {lanes.map((l, li) => (
              <Lane key={l.label} label={l.label} color={l.color} periods={l.periods} delay={li * 0.12} />
            ))}
            <SeasonLane months={season} />

            {/* Today, across every lane. */}
            <div className="pointer-events-none absolute inset-y-0 left-[150px] right-0">
              <motion.div
                className="absolute inset-y-0 w-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ left: `${(today / 12) * 100}%` }}
              >
                <span className="absolute inset-y-0 -left-px border-l-2 border-dashed border-[var(--ap-text)] opacity-50" />
                <span className="absolute -top-1 left-0 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-[var(--ap-text)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--ap-bg)]">
                  Today
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Summary color={SOW} title="Sow / plant" periods={crop.sow} />
        <Summary color={HARVEST} title="Harvest" periods={crop.harvest} />
      </div>

      <Provenance>{CALENDAR_SOURCE}</Provenance>
    </Panel>
  );
}

function Lane({ label, color, periods, delay }: { label: string; color: string; periods: Period[]; delay: number }) {
  // A period that runs past December wraps onto January.
  const pieces = periods.flatMap(([a, b]): Period[] => (b >= a ? [[a, b]] : [[a, 12], [0, b]]));
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center border-t border-divider">
      <span className="py-4 pr-3 text-[13px] font-medium">{label}</span>
      <div className="relative h-14">
        <MonthGrid />
        {pieces.map(([a, b], i) => (
          <motion.span
            key={i}
            className="absolute top-1/2 h-7 -translate-y-1/2 rounded-[8px] shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]"
            style={{ left: `${(a / 12) * 100}%`, width: `${((b - a) / 12) * 100}%`, background: color, originX: 0 }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: delay + i * 0.08, ease: EASE }}
          />
        ))}
      </div>
    </div>
  );
}

/** The months the advice judges climate over, as a faint hatched band. */
function SeasonLane({ months }: { months: number[] }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center border-t border-divider">
      <span className="py-3 pr-3 text-[12.5px] text-muted">Growing season</span>
      <div className="relative h-9">
        <MonthGrid />
        {months.map((m, i) => (
          <motion.span
            key={m}
            className="absolute top-1/2 h-3 -translate-y-1/2 bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--ap-accent)_45%,transparent)_0_3px,transparent_3px_6px)]"
            style={{ left: `${(m / 12) * 100}%`, width: `${100 / 12}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.03 }}
          />
        ))}
      </div>
    </div>
  );
}

function MonthGrid() {
  return (
    <div className="absolute inset-0 grid grid-cols-12">
      {MONTHS.map((m) => (
        <span key={m} className="border-l border-divider">
          <span className="ml-[50%] block h-full border-l border-dashed border-divider opacity-50" />
        </span>
      ))}
    </div>
  );
}

function Summary({ color, title, periods }: { color: string; title: string; periods: Period[] }) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] bg-neutral-100 px-3.5 py-3">
      <span className="mt-1 h-3 w-1.5 flex-none rounded-full" style={{ background: color }} />
      <span className="flex flex-col gap-0.5">
        <span className="text-[12.5px] text-muted">{title}</span>
        {periods.map((p, i) => (
          <span key={i} className="text-[14px] font-medium first-letter:uppercase">
            {periodLabel(p)}
          </span>
        ))}
      </span>
    </div>
  );
}

/* ── Advice ──────────────────────────────────────────────────────────── */

const LEVEL: Record<Level, { color: string; icon: "check" | "alert" | "x" }> = {
  good: { color: "#38A88A", icon: "check" },
  caution: { color: "#E7A83B", icon: "alert" },
  bad: { color: "#D96565", icon: "x" },
};

function headline(a: Advice) {
  const timing = a.checks.find((c) => c.key === "window")!;
  const stage = a.checks.find((c) => c.key === "stage");
  const problems = a.checks.filter((c) => c.group !== "Timing" && c.level === "bad");
  const cautions = a.checks.filter((c) => c.group !== "Timing" && c.level === "caution");
  switch (a.verdict) {
    case "plant":
      return `The sowing period is open and your field meets every requirement. ${timing.note}`;
    case "care":
      return `The sowing period is open. Watch ${cautions.length === 1 ? "one point" : `${cautions.length} points`}: ${cautions
        .map((c) => c.label.toLowerCase())
        .join(", ")}.`;
    case "wait":
      return stage && stage.level !== "good" ? stage.note : `Your field suits it. ${timing.note}`;
    case "avoid":
      return `${problems.map((c) => c.label).join(", ")} ${problems.length === 1 ? "rules" : "rule"} it out on this field.`;
  }
}

function AdvicePanel({
  advice,
  others,
  profile,
  station,
  onPick,
}: {
  advice: Advice;
  others: Advice[];
  profile: FieldProfile;
  station: Station;
  onPick: (id: string) => void;
}) {
  const v = VERDICT[advice.verdict];
  const of = (g: Check["group"]) => advice.checks.filter((c) => c.group === g);

  return (
    <Panel className="flex flex-col gap-5 overflow-hidden px-0 py-0">
      {/* Verdict */}
      <div
        className="flex flex-wrap items-center gap-4 px-5 py-5"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${v.color} 14%, transparent), transparent 70%)` }}
      >
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.1 }}
          className="grid size-12 flex-none place-items-center rounded-full text-white shadow-pop"
          style={{ background: v.color }}
        >
          <Icon name={v.icon} size={22} strokeWidth={2.4} />
        </motion.span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
            Should you plant {advice.crop.name.toLowerCase()}?
          </span>
          <span className="text-[20px] font-semibold leading-tight" style={{ color: v.color }}>
            {v.title}
          </span>
          <span className="text-[13.5px] text-muted">{headline(advice)}</span>
        </span>
        <FitMeter score={advice.score} />
      </div>

      {/* When: the road from today to harvest. */}
      <div className="px-5">
        <TimingStrip advice={advice} />
      </div>

      {/* Whether: climate and soil side by side, the field's own history under them. */}
      <div className="grid gap-x-8 gap-y-5 px-5 lg:grid-cols-2">
        {(["Climate", "Soil"] as const).map((g) => (
          <CheckGroup key={g} title={g} rows={of(g)} />
        ))}
      </div>
      {of("Field").length > 0 && (
        <div className="px-5">
          <CheckGroup title="Field" rows={of("Field")} />
        </div>
      )}

      {/* Alternatives */}
      <div className="flex flex-col gap-3 border-t border-divider px-5 py-5">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[15px] font-semibold">
            {advice.verdict === "plant" ? "Also good on your field" : "Plant instead"}
          </span>
          <span className="text-[12.5px] text-muted">
            Ranked by sowing date, then fit · {profile.agriculture.irrigation} · {station.name}
          </span>
        </span>
        {others.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {others.map((o, i) => (
              <Alternative key={o.crop.id} advice={o} index={i} onPick={() => onPick(o.crop.id)} />
            ))}
          </div>
        ) : (
          <span className="text-[13.5px] text-muted">
            No other crop in the calendar suits this field as it stands. Check the soil figures in your field profile.
          </span>
        )}
      </div>
    </Panel>
  );
}

function FitMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const R = 22;
  const C = 2 * Math.PI * R;
  const color = pct >= 85 ? "#38A88A" : pct >= 65 ? "#E7A83B" : "#D96565";
  return (
    <span className="flex items-center gap-2.5">
      <svg width={56} height={56} viewBox="0 0 56 56" className="-rotate-90">
        <circle cx={28} cy={28} r={R} fill="none" strokeWidth={6} style={{ stroke: "var(--ap-neutral-100)" }} />
        <motion.circle
          cx={28}
          cy={28}
          r={R}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - score) }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <span className="flex flex-col leading-tight">
        <span className="text-[18px] font-semibold tabular-nums">{pct}%</span>
        <span className="text-[11.5px] text-muted">field fit</span>
      </span>
    </span>
  );
}

function CheckGroup({ title, rows }: { title: string; rows: Check[] }) {
  const met = rows.filter((c) => c.level === "good").length;
  return (
    <div className="flex flex-col">
      <span className="flex items-baseline justify-between pb-1.5">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</span>
        <span className="text-[11.5px] text-muted tabular-nums">
          {met}/{rows.length} met
        </span>
      </span>
      {rows.map((c, i) => (
        <CheckRow key={c.key} check={c} index={i} />
      ))}
    </div>
  );
}

function CheckRow({ check, index }: { check: Check; index: number }) {
  const look = LEVEL[check.level];
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.04 }}
      className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-2.5 border-b border-divider py-2.5 last:border-b-0 sm:grid-cols-[22px_minmax(0,1fr)_112px_88px]"
    >
      <span
        className="mt-px grid size-[22px] place-items-center rounded-full"
        style={{ color: look.color, background: `color-mix(in srgb, ${look.color} 15%, transparent)` }}
      >
        <Icon name={look.icon} size={13} strokeWidth={2.4} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13.5px] font-medium">{check.label}</span>
        <span className="text-[12.5px] leading-snug text-muted">{check.note}</span>
      </span>
      <span className="hidden sm:block">{check.scale && <RangeBar scale={check.scale} color={look.color} delay={index * 0.04} />}</span>
      <span className="whitespace-nowrap text-right text-[13px] font-semibold tabular-nums first-letter:uppercase">
        {check.value}
      </span>
    </motion.div>
  );
}

/** The crop's tolerated band, its optimal band inside it, and the field's value. */
function RangeBar({ scale, color, delay }: { scale: NonNullable<Check["scale"]>; color: string; delay: number }) {
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - scale.lo) / (scale.hi - scale.lo)) * 100))}%`;
  const width = (r: [number, number]) =>
    `${Math.max(0, Math.min(100, ((Math.min(r[1], scale.hi) - Math.max(r[0], scale.lo)) / (scale.hi - scale.lo)) * 100))}%`;
  return (
    <span className="relative block h-2 rounded-full bg-neutral-100" title="Amber: what the crop tolerates. Green: what it prefers.">
      {scale.abs && (
        <span
          className="absolute inset-y-0 rounded-full"
          style={{ left: pos(scale.abs[0]), width: width(scale.abs), background: "color-mix(in srgb, #E7A83B 28%, transparent)" }}
        />
      )}
      <span
        className="absolute inset-y-0 rounded-full"
        style={{ left: pos(scale.opt[0]), width: width(scale.opt), background: "color-mix(in srgb, #38A88A 45%, transparent)" }}
      />
      <motion.span
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--ap-surface)] shadow"
        style={{ background: color }}
        initial={{ left: "0%", opacity: 0 }}
        animate={{ left: pos(scale.v), opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15 + delay, ease: EASE }}
      />
    </span>
  );
}

/**
 * The road ahead, to scale: waiting for the sowing period, sowing, the
 * crop growing, and the harvest, with the key dates under it.
 */
function TimingStrip({ advice }: { advice: Advice }) {
  const [today] = React.useState(() => monthPos());
  const [s0, s1] = advice.sowPeriod;
  const [h0, h1] = advice.harvestPeriod;
  const wait = advice.openNow ? 0 : daysBetween(today, s0);
  const sowing = advice.openNow ? daysBetween(today, s1) : daysBetween(s0, s1);
  const growing = daysBetween(s1, h0);
  const harvest = Math.max(1, daysBetween(h0, h1) || 30);
  const total = wait + sowing + growing + harvest;
  const stage = advice.checks.find((c) => c.key === "stage");

  const parts = [
    { key: "wait", days: wait, label: "Waiting", style: { background: "var(--ap-neutral-100)" } },
    { key: "sow", days: sowing, label: "Sowing", style: { background: SOW } },
    {
      key: "grow",
      days: growing,
      label: "Growing",
      style: {
        background:
          "repeating-linear-gradient(135deg, color-mix(in srgb, var(--ap-accent) 40%, transparent) 0 4px, color-mix(in srgb, var(--ap-accent) 14%, transparent) 4px 8px)",
      },
    },
    { key: "harvest", days: harvest, label: "Harvest", style: { background: HARVEST } },
  ].filter((p) => p.days > 0);

  const tiles = [
    {
      label: advice.openNow ? "Sowing" : "Sowing opens",
      value: advice.openNow ? "Open now" : `In ${wait} days`,
      sub: advice.openNow ? `${sowing} days left` : posLabel(s0),
      color: advice.openNow ? SOW : "#2F7FD1",
      icon: advice.openNow ? ("sprout" as const) : ("clock" as const),
    },
    { label: "Sowing closes", value: posLabel(s1), sub: `${daysBetween(today, s1)} days from today`, color: SOW, icon: "calendar" as const },
    { label: "Harvest", value: posLabel(h0), sub: `to ${posLabel(h1)}`, color: HARVEST, icon: "wheat" as const },
    {
      label: "Season length",
      value: `${Math.round((sowing + growing + harvest) / 30.44)} months`,
      sub: "sowing to harvest",
      color: "var(--ap-accent)",
      icon: "trend" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-[16px] border border-divider px-4 py-4">
      <span className="flex items-baseline justify-between">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Timing</span>
        <span className="text-[11.5px] text-muted">From today to harvest, to scale</span>
      </span>

      <div className="flex flex-col gap-2">
        <div className="flex h-3.5 gap-1 overflow-hidden rounded-full">
          {parts.map((p, i) => (
            <motion.span
              key={p.key}
              className="h-full rounded-full"
              style={{ ...p.style, flexBasis: 0 }}
              initial={{ flexGrow: 0.0001, opacity: 0 }}
              animate={{ flexGrow: p.days / total, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.1, ease: EASE }}
              title={`${p.label}: ${p.days} days`}
            />
          ))}
        </div>
        <div className="flex gap-1 text-[11.5px] text-muted">
          {parts.map((p) => (
            <span key={p.key} className="min-w-0 truncate" style={{ flex: `${p.days / total} 1 0` }}>
              {p.label} · {p.days} d
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
            className="flex items-center gap-3 rounded-[12px] bg-neutral-100 px-3 py-2.5"
          >
            <span
              className="grid size-9 flex-none place-items-center rounded-[10px]"
              style={{ color: t.color, background: `color-mix(in srgb, ${t.color} 16%, transparent)` }}
            >
              {t.icon === "wheat" ? <Wheat size={17} /> : <Icon name={t.icon} size={17} />}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[11.5px] text-muted">{t.label}</span>
              <span className="truncate text-[14.5px] font-semibold first-letter:uppercase">{t.value}</span>
              <span className="truncate text-[11.5px] text-muted">{t.sub}</span>
            </span>
          </motion.div>
        ))}
      </div>

      {stage && stage.level !== "good" && (
        <span className="flex items-center gap-2 rounded-[10px] bg-[color-mix(in_srgb,#2F7FD1_10%,transparent)] px-3 py-2 text-[12.5px]">
          <Icon name="info" size={14} />
          {stage.note}
        </span>
      )}
    </div>
  );
}

function Alternative({ advice, index, onPick }: { advice: Advice; index: number; onPick: () => void }) {
  const v = VERDICT[advice.verdict];
  const strengths = advice.checks.filter((c) => c.group !== "Timing" && c.level === "good").length;
  const total = advice.checks.filter((c) => c.group !== "Timing").length;
  return (
    <motion.button
      type="button"
      onClick={onPick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 + index * 0.06, ease: EASE }}
      whileHover={{ y: -2 }}
      className="group flex items-center gap-3 rounded-[14px] border border-divider bg-surface p-2.5 text-left transition-[border-color,box-shadow] hover:border-[color-mix(in_srgb,var(--ap-accent)_45%,transparent)] hover:shadow-pop"
    >
      <CropImage crop={advice.crop} className="size-14 flex-none rounded-[10px]" iconSize={22} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold">{advice.crop.name}</span>
        <span className="flex items-center gap-1.5 text-[12px]" style={{ color: advice.openNow ? SOW : "#2F7FD1" }}>
          <Icon name={advice.openNow ? "sprout" : "clock"} size={12} />
          {advice.openNow ? "Sowing open now" : `Sowing in ${advice.waitDays} days`}
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <span className="size-1.5 rounded-full" style={{ background: v.color }} />
          {strengths}/{total} requirements met
        </span>
      </span>
      <span className="text-muted transition-transform group-hover:translate-x-0.5">
        <Icon name="right" size={16} />
      </span>
    </motion.button>
  );
}
