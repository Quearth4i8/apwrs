"use client";

import * as React from "react";
import { Reveal } from "@/components/ui/reveal";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { CropImage } from "@/components/crop-visual";
import { ButtonLink, Panel, PageHeader } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { HoverGuide, HoverReadout, useBarHover, useElementWidth } from "@/components/ui/chart-hover";
import { stationForSite } from "@/lib/climate";
import { CALENDAR_CROPS, calendarCrop, type CalendarCrop } from "@/lib/crop-calendar";
import { IRRIGATION, PROFILE_USER, useFieldProfile } from "@/lib/field-profile";
import {
  CROP_WATER,
  EFFICIENCY,
  STAGE_NAMES,
  kcAt,
  runWater,
  seasonDays,
  seasonEtc,
  seasonPlan,
  type EtcDay,
  type WaterDay,
} from "@/lib/irrigation";
import { useForecast } from "@/lib/use-forecast";

/**
 * The irrigation calendar: for a crop and its sowing date, how much water it
 * uses today, whether to irrigate and how much, and the days ahead — from
 * the live forecast, the user's field profile and the FAO-56 water balance
 * (lib/irrigation.ts). A season plan from 30-year means sits underneath for
 * crops not yet sown.
 */

const EASE = [0.2, 0.8, 0.2, 1] as const;
const WATER = "#2F7FD1";
const ETC = "#EE8434";
const RAIN = "var(--ap-accent)";
const DAY = 86_400_000;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const todayIso = () => iso(new Date());
const fmt = (d: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
const daysFrom = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/**
 * The sowing date to start from: this season's, if the crop would be in the
 * ground today; otherwise the next one.
 */
function defaultSowing(crop: CalendarCrop): string {
  const w = CROP_WATER[crop.id];
  const now = new Date();
  const y = now.getUTCFullYear();
  const dates = crop.sow.flatMap(([from]) =>
    [y - 1, y, y + 1].map((yr) => {
      const m = Math.floor(from);
      const dim = new Date(Date.UTC(yr, m + 1, 0)).getUTCDate();
      return iso(new Date(Date.UTC(yr, m, 1 + Math.round((from - m) * dim))));
    }),
  );
  const t = todayIso();
  const growing = dates.filter((d) => d <= t && daysFrom(d, t) < seasonDays(w)).sort();
  if (growing.length) return growing[growing.length - 1];
  return dates.filter((d) => d > t).sort()[0];
}

export function PageIrrigation() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const { profile, saved } = useFieldProfile(PROFILE_USER);
  const { data, error } = useForecast(station.id);

  // Start on the crop the profile says is in the field, if any.
  const [cropId, setCropId] = React.useState(() =>
    CALENDAR_CROPS.some((c) => c.id === profile.agriculture.cropType) ? profile.agriculture.cropType : "wheat-durum",
  );
  const crop = calendarCrop(cropId);
  const [sowByCrop, setSowByCrop] = React.useState<Record<string, string>>({});
  const sowDate = sowByCrop[crop.id] ?? defaultSowing(crop);
  const setSowDate = (d: string) => setSowByCrop((m) => ({ ...m, [crop.id]: d }));

  const today = todayIso();
  const w = CROP_WATER[crop.id];
  const age = daysFrom(sowDate, today);
  const sown = age >= 0;
  const over = age >= seasonDays(w);

  // The React compiler memoises these; both are cheap (a season of days).
  const water = data && sown ? runWater(crop, sowDate, data.days, profile, station) : [];
  const plan = seasonPlan(crop, sowDate, station, profile);
  const todayRow = water.find((r) => r.date === today);
  const ahead = water.filter((r) => r.date >= today).slice(0, 16);

  return (
    <Reveal className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title="Irrigation calendar"
        lede="How much water your crop uses each day, and when and how much to irrigate."
        actions={
          <ButtonLink href="/app/profile">
            <Icon name="pencil" size={14} />
            Field profile
          </ButtonLink>
        }
      />

      {/* ── Crop and sowing date ──────────────────────────────────────── */}
      <Panel className="flex flex-col gap-4 px-5 py-4">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {CALENDAR_CROPS.map((c) => {
            const on = c.id === crop.id;
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => setCropId(c.id)}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-none items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-[13px] transition-colors ${
                  on
                    ? "border-[var(--ap-accent)] bg-accent-100 font-semibold"
                    : "border-divider bg-surface hover:border-[color-mix(in_srgb,var(--ap-accent)_45%,transparent)]"
                }`}
              >
                <CropImage crop={c} className="size-7 rounded-full" iconSize={14} />
                {c.name}
              </motion.button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Sowing date</span>
            <input
              type="date"
              value={sowDate}
              onChange={(e) => e.target.value && setSowDate(e.target.value)}
              className="h-10 rounded-[10px] border border-divider bg-bg px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] focus:border-[var(--ap-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ap-accent)_18%,transparent)]"
            />
          </label>
          <Fact label="Crop age" value={sown ? (over ? "Harvested" : `Day ${age + 1} of ${seasonDays(w)}`) : `Sown in ${-age} days`} />
          <Fact
            label="Growth stage"
            value={sown && !over ? `${STAGE_NAMES[Math.min(3, stageIndex(w.stages, age))]} · Kc ${kcAt(w, age).toFixed(2)}` : "—"}
          />
          <Fact
            label="Irrigation"
            value={`${IRRIGATION.find((i) => i.value === profile.agriculture.irrigation)?.label}${
              profile.agriculture.irrigation === "rainfed" ? "" : ` · ${Math.round(EFFICIENCY[profile.agriculture.irrigation] * 100)}% efficient`
            }`}
          />
          {!saved && (
            <Link href="/app/profile" className="ml-auto self-center text-[12.5px] text-accent no-underline hover:underline">
              Using default soil and system — set your field &rarr;
            </Link>
          )}
        </div>
      </Panel>

      {error && (
        <NoData
          icon="cloud"
          title="Forecast unavailable"
          what="The daily calendar needs the weather forecast. The season plan below still works from 30-year means."
          needs="connection to Open-Meteo"
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${crop.id}-${sowDate}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="flex flex-col gap-6"
        >
          {!sown && (
            <Notice icon="clock">
              {crop.name} is not in the ground yet: sowing on {fmt(sowDate, { day: "numeric", month: "long" })}, in {-age} days. The daily
              calendar starts on sowing day; the season plan below shows what to expect.
            </Notice>
          )}
          {over && (
            <Notice icon="check">
              This crop&apos;s season ended on {fmt(iso(new Date(Date.parse(sowDate) + seasonDays(w) * DAY)), { day: "numeric", month: "long" })}.
              Pick a later sowing date to plan the next one.
            </Notice>
          )}

          {sown && !over && todayRow && (
            <>
              <TodayCard row={todayRow} ahead={ahead} rainfed={profile.agriculture.irrigation === "rainfed"} />
              <StageStrip stages={w.stages} age={age} />
              <DaysGrid rows={ahead} today={today} rainfed={profile.agriculture.irrigation === "rainfed"} />
              <WaterChart rows={water.filter((r) => daysFrom(r.date, today) <= 30)} today={today} />
            </>
          )}
          {sown && !over && !todayRow && !error && <Notice icon="clock">Loading the forecast…</Notice>}

          <SeasonEtc days={seasonEtc(crop, sowDate, data?.days ?? [], station)} today={today} stages={w.stages} />

          <SeasonPlan
            plan={plan}
            crop={crop}
            sowDate={sowDate}
            normals={`${station.coverage.from.slice(0, 4)}–${station.coverage.to.slice(0, 4)}`}
            rainfed={profile.agriculture.irrigation === "rainfed"}
          />
        </motion.div>
      </AnimatePresence>

      <Provenance>
        FAO-56 single crop coefficient and root-zone water balance · ET₀ and rain: Open-Meteo forecast, {station.name} 30-year means before
        it · soil from your field profile
      </Provenance>
    </Reveal>
  );
}

function stageIndex(stages: [number, number, number, number], age: number) {
  let acc = 0;
  for (let s = 0; s < 4; s++) {
    acc += stages[s];
    if (age < acc) return s;
  }
  return 3;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
      <span className="flex h-10 items-center rounded-[10px] bg-neutral-100 px-3 text-[13.5px] font-medium">{value}</span>
    </span>
  );
}

function Notice({ icon, children }: { icon: "clock" | "check"; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-panel border border-[color-mix(in_srgb,#2F7FD1_30%,transparent)] bg-[color-mix(in_srgb,#2F7FD1_8%,transparent)] px-4 py-3 text-[13.5px]">
      <span style={{ color: WATER }}>
        <Icon name={icon} size={17} />
      </span>
      <span>{children}</span>
    </div>
  );
}

/* ── Today ───────────────────────────────────────────────────────────── */

function TodayCard({ row, ahead, rainfed }: { row: WaterDay; ahead: WaterDay[]; rainfed: boolean }) {
  const next = ahead.find((r) => r.date > row.date && r.irrigateGross > 0);
  const stressed = rainfed && row.depletion > row.raw;
  const left = Math.max(0, 1 - row.depletion / row.taw);
  const threshold = 1 - row.raw / row.taw;
  const water = row.irrigateGross > 0;

  const title = rainfed
    ? stressed
      ? "Crop under water stress"
      : "No stress today"
    : water
      ? `Irrigate ${Math.round(row.irrigateGross)} mm today`
      : "No irrigation needed today";
  const color = water || stressed ? WATER : "#38A88A";
  const sub = rainfed
    ? stressed
      ? `The soil has dried past what the crop can easily draw. On a rainfed field, the next good rain is the only relief.`
      : `The root zone still holds enough water for the crop.`
    : water
      ? `The root zone has dried past what the crop can easily draw. ${Math.round(row.irrigateNet)} mm brings it back to full; the rest allows for system losses.`
      : next
        ? `Next irrigation around ${fmt(next.date, { weekday: "long", day: "numeric", month: "short" })}: about ${Math.round(next.irrigateGross)} mm.`
        : "Rain and the water in the soil cover the next 16 days.";

  return (
    <Panel className="grid gap-6 overflow-hidden p-0 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="flex flex-col gap-5 px-5 py-5">
        <div className="flex items-start gap-4">
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="grid size-12 flex-none place-items-center rounded-full text-white shadow-pop"
            style={{ background: color }}
          >
            <Icon name={water || stressed ? "droplet" : "check"} size={22} strokeWidth={2.2} />
          </motion.span>
          <span className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
              Today · {fmt(row.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="text-[24px] font-semibold leading-tight" style={{ color }}>
              {title}
            </span>
            <span className="text-[13.5px] text-muted">{sub}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Metric label="Crop water use" value={row.etc.toFixed(1)} unit="mm" note={`Kc ${row.kc.toFixed(2)} × ET₀ ${row.et0.toFixed(1)}`} color={ETC} />
          <Metric label="Rain" value={row.rain.toFixed(1)} unit="mm" note={`${row.effectiveRain.toFixed(1)} mm useful`} color={RAIN} />
          <Metric label="Water in reach" value={Math.round(row.taw - row.depletion).toString()} unit="mm" note={`of ${Math.round(row.taw)} mm`} color={WATER} />
          <Metric
            label="Next 7 days"
            value={ahead.slice(0, 7).reduce((a, r) => a + r.etc, 0).toFixed(0)}
            unit="mm"
            note={rainfed ? "crop water use" : `${Math.round(ahead.slice(0, 7).reduce((a, r) => a + r.irrigateGross, 0))} mm to irrigate`}
            color={ETC}
          />
        </div>
      </div>

      <Tank left={left} threshold={threshold} />
    </Panel>
  );
}

function Metric({ label, value, unit, note, color }: { label: string; value: string; unit: string; note: string; color: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] bg-neutral-100 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[12px] text-muted">
        <span className="size-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none tabular-nums">{value}</span>
        <span className="text-[12px] text-muted">{unit}</span>
      </span>
      <span className="truncate text-[11.5px] text-muted">{note}</span>
    </div>
  );
}

/** The root zone as a tank: what is left, and the line below which to irrigate. */
function Tank({ left, threshold }: { left: number; threshold: number }) {
  return (
    <div className="flex items-center justify-center gap-4 border-t border-divider bg-[color-mix(in_srgb,#2F7FD1_5%,transparent)] px-5 py-5 lg:border-l lg:border-t-0">
      <div className="relative h-[170px] w-[86px] overflow-hidden rounded-[18px] border-2 border-[color-mix(in_srgb,#2F7FD1_35%,transparent)] bg-surface">
        <motion.div
          className="absolute inset-x-0 bottom-0"
          style={{ background: `linear-gradient(to top, ${WATER}, color-mix(in srgb, ${WATER} 55%, transparent))` }}
          initial={{ height: "0%" }}
          animate={{ height: `${left * 100}%` }}
          transition={{ duration: 1, ease: EASE }}
        >
          {/* a slow wave on the surface */}
          <motion.svg
            viewBox="0 0 120 10"
            preserveAspectRatio="none"
            className="absolute -top-[7px] left-0 h-2 w-[200%]"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 4, ease: "linear", repeat: Infinity }}
          >
            <path d="M0 5 Q 15 0 30 5 T 60 5 T 90 5 T 120 5 V10 H0Z" fill={`color-mix(in srgb, ${WATER} 55%, transparent)`} />
          </motion.svg>
        </motion.div>
        <div className="absolute inset-x-0 border-t-2 border-dashed border-[#D96565]" style={{ bottom: `${threshold * 100}%` }} />
      </div>
      <div className="flex flex-col gap-3 text-[12px]">
        <span className="flex flex-col">
          <span className="text-[26px] font-semibold leading-none tabular-nums" style={{ color: WATER }}>
            {Math.round(left * 100)}%
          </span>
          <span className="text-muted">of the root zone&apos;s water left</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="w-4 border-t-2 border-dashed border-[#D96565]" />
          irrigate below {Math.round(threshold * 100)}%
        </span>
      </div>
    </div>
  );
}

/* ── Stages ──────────────────────────────────────────────────────────── */

function StageStrip({ stages, age }: { stages: [number, number, number, number]; age: number }) {
  const total = stages.reduce((a, b) => a + b, 0);
  const colors = ["#9BC27A", "#6AB04C", "#3E8E41", "#C9A227"];
  return (
    <Panel className="flex flex-col gap-3 px-5 py-4">
      <span className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold">Growth stages</span>
        <span className="text-[12px] text-muted">Water use rises with the canopy and falls as the crop ripens</span>
      </span>
      <div className="relative pt-5">
        <div className="flex h-3 gap-1">
          {stages.map((d, i) => (
            <motion.span
              key={i}
              className="h-full rounded-full"
              style={{ background: colors[i], flexBasis: 0 }}
              initial={{ flexGrow: 0.0001 }}
              animate={{ flexGrow: d / total }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
            />
          ))}
        </div>
        <motion.div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          initial={{ left: "0%" }}
          animate={{ left: `${Math.min(100, (age / total) * 100)}%` }}
          transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
        >
          <span className="rounded-full bg-[var(--ap-text)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--ap-bg)]">Today</span>
          <span className="h-5 w-0.5 bg-[var(--ap-text)]" />
        </motion.div>
        <div className="mt-2 flex gap-1 text-[11.5px] text-muted">
          {stages.map((d, i) => (
            <span key={i} className="min-w-0 truncate" style={{ flex: `${d / total} 1 0` }}>
              {STAGE_NAMES[i]} · {d} d
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ── Next 16 days ────────────────────────────────────────────────────── */

function DaysGrid({ rows, today, rainfed }: { rows: WaterDay[]; today: string; rainfed: boolean }) {
  const maxEtc = Math.max(...rows.map((r) => r.etc), 1);
  const total = rows.reduce((a, r) => a + r.irrigateGross, 0);
  const events = rows.filter((r) => r.irrigateGross > 0).length;
  return (
    <Panel className="flex flex-col gap-4 px-5 py-5">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-lg font-semibold">Next {rows.length} days</span>
          {rows.length > 0 && (
            <span className="text-[12.5px] text-muted tabular-nums">
              {fmt(rows[0].date)} – {fmt(rows[rows.length - 1].date, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </span>
        <span className="text-[13px] text-muted">
          {rainfed
            ? `${Math.round(rows.reduce((a, r) => a + r.etc, 0))} mm crop water use · ${rows.filter((r) => r.depletion > r.raw).length} stress days`
            : events
              ? `${events} irrigation${events === 1 ? "" : "s"} · ${Math.round(total)} mm in total`
              : "No irrigation needed"}
        </span>
      </span>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        {rows.map((r, i) => {
          const isToday = r.date === today;
          const irrigate = r.irrigateGross > 0;
          const stress = rainfed && r.depletion > r.raw;
          return (
            <motion.div
              key={r.date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.025, ease: EASE }}
              whileHover={{ y: -2 }}
              className={`relative flex flex-col gap-1.5 rounded-[12px] border px-2.5 py-2.5 ${
                irrigate || stress
                  ? "border-[color-mix(in_srgb,#2F7FD1_45%,transparent)] bg-[color-mix(in_srgb,#2F7FD1_8%,transparent)]"
                  : isToday
                    ? "border-[var(--ap-accent)]"
                    : "border-divider"
              }`}
            >
              <span className="flex items-baseline justify-between">
                <span className="text-[12.5px] font-semibold">{isToday ? "Today" : fmt(r.date, { weekday: "short" })}</span>
                <span className="text-[11px] text-muted">{fmt(r.date)}</span>
              </span>
              <span className="flex h-7 items-center gap-1.5">
                {irrigate ? (
                  <>
                    <span style={{ color: WATER }}>
                      <Icon name="droplet" size={16} />
                    </span>
                    <span className="text-[16px] font-semibold tabular-nums" style={{ color: WATER }}>
                      {Math.round(r.irrigateGross)} mm
                    </span>
                  </>
                ) : stress ? (
                  <span className="text-[12px] font-semibold" style={{ color: WATER }}>
                    Stress
                  </span>
                ) : (
                  <span className="text-[12px] text-muted">No watering</span>
                )}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted tabular-nums">
                <span className="h-1 flex-1 rounded-full bg-neutral-100">
                  <span className="block h-full rounded-full" style={{ width: `${(r.etc / maxEtc) * 100}%`, background: ETC }} />
                </span>
                {r.etc.toFixed(1)}
              </span>
              <span className="text-[11px] text-muted tabular-nums">{r.rain >= 0.1 ? `Rain ${r.rain.toFixed(1)} mm` : "Dry"}</span>
            </motion.div>
          );
        })}
      </div>
      <span className="flex flex-wrap gap-4 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded-full" style={{ background: ETC }} />
          Crop water use, mm
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: WATER }}>
            <Icon name="droplet" size={12} />
          </span>
          Irrigate, mm (with system losses)
        </span>
      </span>
    </Panel>
  );
}

/* ── Soil water chart ────────────────────────────────────────────────── */

function WaterChart({ rows, today }: { rows: WaterDay[]; today: string }) {
  const [ref, W] = useElementWidth<HTMLDivElement>(880);
  const H = 220;
  const pad = { l: 40, r: 12, t: 22, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const slot = innerW / Math.max(1, rows.length);
  const x = (i: number) => pad.l + (i + 0.5) * slot;
  const y = (pct: number) => pad.t + innerH - (pct / 100) * innerH;
  const pct = (r: WaterDay) => Math.max(0, (1 - r.depletion / r.taw) * 100);
  const line = rows.map((r, i) => `${x(i).toFixed(1)} ${y(pct(r)).toFixed(1)}`).join("L");
  const threshold = rows.map((r, i) => `${x(i).toFixed(1)} ${y((1 - r.raw / r.taw) * 100).toFixed(1)}`).join("L");
  const ti = rows.findIndex((r) => r.date === today);

  const hover = useBarHover(rows.length, pad.l, pad.r, W);
  const at = hover.index == null ? null : rows[hover.index];

  return (
    <Panel className="flex flex-col gap-3 px-5 py-5">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-lg font-semibold">Water in the root zone</span>
          {rows.length > 0 && (
            <span className="text-[12.5px] text-muted tabular-nums">
              {fmt(rows[0].date)} – {fmt(rows[rows.length - 1].date, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-3.5 text-[12px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded-full" style={{ background: WATER }} />
            Water left
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-[#D96565]" />
            Irrigate below
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: WATER }}>
              <Icon name="droplet" size={12} />
            </span>
            Irrigation
          </span>
        </span>
      </span>
      <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
        <HoverReadout hover={hover} left={pad.l} right={pad.r} width={W}>
          {at && (
            <>
              {fmt(at.date, { weekday: "short", day: "numeric", month: "short" })} &middot; {Math.round(pct(at))}% left &middot; uses{" "}
              {at.etc.toFixed(1)} mm{at.irrigateGross > 0 ? ` · irrigate ${Math.round(at.irrigateGross)} mm` : ""}
              {at.source === "climate" ? " · from 30-yr means" : at.source === "forecast" ? " · forecast" : ""}
            </>
          )}
        </HoverReadout>
        <svg width={W} height={H} className="block">
          <defs>
            <linearGradient id="irr-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={WATER} stopOpacity={0.25} />
              <stop offset="100%" stopColor={WATER} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {ti >= 0 && (
            <rect x={pad.l + ti * slot} y={pad.t} width={W - pad.r - (pad.l + ti * slot)} height={innerH} rx={8} style={{ fill: "var(--ap-neutral-100)" }} fillOpacity={0.6} />
          )}
          <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.07 }}>
            {[0, 50, 100].map((t) => (
              <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <path d={`M${threshold}`} fill="none" stroke="#D96565" strokeOpacity={0.8} strokeWidth={1.5} strokeDasharray="4 3" />
          <motion.path
            d={`M${line}L${x(rows.length - 1)} ${y(0)}L${x(0)} ${y(0)}Z`}
            fill="url(#irr-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
          <motion.path
            d={`M${line}`}
            fill="none"
            stroke={WATER}
            strokeWidth={2.25}
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
          />
          {rows.map((r, i) =>
            r.irrigateGross > 0 ? (
              <motion.g
                key={r.date}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.01 }}
              >
                <circle cx={x(i)} cy={pad.t - 8} r={7} fill={WATER} />
                <path d={`M${x(i)} ${pad.t - 12} q 3 4 0 7 q -3 -3 0 -7z`} fill="#fff" />
                <line x1={x(i)} x2={x(i)} y1={pad.t - 1} y2={y(100)} stroke={WATER} strokeOpacity={0.4} />
              </motion.g>
            ) : null,
          )}
          <HoverGuide hover={hover} left={pad.l} right={pad.r} width={W} top={pad.t} bottom={pad.t + innerH} />
          {at && <circle cx={x(hover.index!)} cy={y(pct(at))} r={4.5} fill={WATER} style={{ stroke: "var(--ap-surface)" }} strokeWidth={2} />}
          <g style={{ fill: "var(--ap-muted)" }} fontSize={11.5}>
            {[0, 50, 100].map((t) => (
              <text key={t} x={pad.l - 8} y={y(t) + 4} textAnchor="end">
                {t}%
              </text>
            ))}
            {rows.map((r, i) =>
              i % 7 === 0 ? (
                <text key={r.date} x={x(i)} y={H - 7} textAnchor="middle">
                  {fmt(r.date)}
                </text>
              ) : null,
            )}
            {ti >= 0 && (
              <text x={pad.l + ti * slot + 6} y={pad.t + 14}>
                Forecast
              </text>
            )}
          </g>
        </svg>
      </div>
    </Panel>
  );
}

/* ── Crop water use over the whole season ────────────────────────────── */

const SOURCE: Record<EtcDay["source"], { label: string; opacity: number }> = {
  observed: { label: "Measured weather", opacity: 0.95 },
  forecast: { label: "Forecast", opacity: 0.6 },
  climate: { label: "1996–2025 average", opacity: 0.3 },
};
const STAGE_TINT = ["#9BC27A", "#6AB04C", "#3E8E41", "#C9A227"];

function SeasonEtc({ days, today, stages }: { days: EtcDay[]; today: string; stages: [number, number, number, number] }) {
  const [ref, W] = useElementWidth<HTMLDivElement>(880);
  const H = 260;
  const pad = { l: 40, r: 40, t: 30, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = days.length;
  const slot = innerW / Math.max(1, n);
  const x = (i: number) => pad.l + (i + 0.5) * slot;

  const peak = days.reduce<EtcDay | null>((m, d) => (!m || d.etc > m.etc ? d : m), null);
  const top = Math.max(1, ...days.map((d) => d.etc));
  const step = top > 8 ? 2 : 1;
  const max = Math.ceil(top / step) * step;
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  // Kc on its own axis, 0 to 1.4, on the right.
  const yk = (k: number) => pad.t + innerH - (k / 1.4) * innerH;

  const total = days.reduce((a, d) => a + d.etc, 0);
  const used = days.filter((d) => d.date < today).reduce((a, d) => a + d.etc, 0);
  const real = days.filter((d) => d.source !== "climate").length;
  const ti = days.findIndex((d) => d.date >= today);
  const todayX = ti > 0 ? pad.l + ti * slot : null;

  const hover = useBarHover(n, pad.l, pad.r, W);
  const at = hover.index == null ? null : days[hover.index];
  const kcLine = days.map((d, i) => `${x(i).toFixed(1)} ${yk(d.kc).toFixed(1)}`).join("L");
  const first = days[0]?.date;
  const last = days[n - 1]?.date;

  // Stage bands, to scale.
  const bands = stages.map((len, k) => {
    const from = stages.slice(0, k).reduce((a, b) => a + b, 0);
    return { k, from, to: from + len };
  });

  // A tick at each month start.
  const ticks = days.map((d, i) => ({ d, i })).filter(({ d, i }) => i === 0 || d.date.slice(8) === "01");

  return (
    <Panel className="flex flex-col gap-4 px-5 py-5">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-lg font-semibold">Crop water use (ETc), whole season</span>
          {first && last && (
            <span className="text-[12.5px] text-muted tabular-nums">
              {fmt(first, { day: "numeric", month: "short", year: "numeric" })} – {fmt(last, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </span>
        <span className="text-[12px] text-muted">ETc = Kc × ET₀, every day from sowing to harvest</span>
      </span>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Metric label="Whole season" value={Math.round(total).toString()} unit="mm" note={`${n} days · ≈ ${Math.round(total * 10)} m³/ha`} color={ETC} />
        <Metric
          label="Used so far"
          value={Math.round(used).toString()}
          unit="mm"
          note={ti > 0 ? `${Math.round((used / (total || 1)) * 100)}% of the season` : ti === 0 ? "not sown yet" : "season over"}
          color={ETC}
        />
        <Metric label="Still to come" value={Math.round(total - used).toString()} unit="mm" note="from today to harvest" color={ETC} />
        <Metric
          label="Peak day"
          value={peak ? peak.etc.toFixed(1) : "—"}
          unit="mm"
          note={peak ? fmt(peak.date, { day: "numeric", month: "short", year: "numeric" }) : ""}
          color={ETC}
        />
      </div>

      <div ref={ref} className="relative" onMouseMove={hover.onMouseMove} onMouseLeave={hover.onMouseLeave}>
        <HoverReadout hover={hover} left={pad.l} right={pad.r} width={W}>
          {at && (
            <>
              {fmt(at.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} &middot; day {at.dayAfterSowing + 1} &middot;{" "}
              {STAGE_NAMES[Math.min(3, at.stage)]} &middot; Kc {at.kc.toFixed(2)} × ET₀ {at.et0.toFixed(1)} = <strong>{at.etc.toFixed(1)} mm</strong>{" "}
              &middot; {SOURCE[at.source].label.toLowerCase()}
            </>
          )}
        </HoverReadout>
        <svg width={W} height={H} className="block">
          {/* growth stages behind everything */}
          {bands.map((b) => (
            <g key={b.k}>
              <rect
                x={pad.l + b.from * slot}
                y={pad.t}
                width={(b.to - b.from) * slot}
                height={innerH}
                fill={STAGE_TINT[b.k]}
                fillOpacity={0.07}
              />
              <text x={pad.l + b.from * slot + 6} y={pad.t - 10} fontSize={11} fontWeight={600} fill={STAGE_TINT[b.k]}>
                {(b.to - b.from) * slot > 70 ? STAGE_NAMES[b.k] : ""}
              </text>
            </g>
          ))}
          <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.07 }}>
            {Array.from({ length: max / step + 1 }, (_, k) => k * step).map((t) => (
              <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            ))}
          </g>

          {days.map((d, i) => {
            const h = (d.etc / max) * innerH;
            return (
              <motion.rect
                key={d.date}
                x={pad.l + i * slot + (slot > 3 ? 0.4 : 0)}
                width={Math.max(0.6, slot - (slot > 3 ? 0.8 : 0))}
                rx={Math.min(1.5, slot / 3)}
                fill={ETC}
                fillOpacity={hover.index === i ? 1 : SOURCE[d.source].opacity}
                initial={{ y: pad.t + innerH, height: 0 }}
                animate={{ y: pad.t + innerH - h, height: h }}
                transition={{ duration: 0.5, delay: Math.min(0.45, i * 0.002), ease: EASE }}
              />
            );
          })}

          <HoverGuide hover={hover} left={pad.l} right={pad.r} width={W} top={pad.t} bottom={pad.t + innerH} />

          {/* Kc, the crop's share of the reference rate */}
          <motion.path
            d={`M${kcLine}`}
            fill="none"
            stroke="var(--ap-text)"
            strokeOpacity={0.7}
            strokeWidth={1.75}
            strokeDasharray="5 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
          />

          {todayX != null && (
            <g>
              <line x1={todayX} x2={todayX} y1={pad.t} y2={pad.t + innerH} style={{ stroke: "var(--ap-text)" }} strokeOpacity={0.5} strokeDasharray="3 3" />
              <rect x={todayX - 22} y={pad.t + 2} width={44} height={17} rx={8.5} style={{ fill: "var(--ap-text)" }} />
              <text x={todayX} y={pad.t + 14} textAnchor="middle" fontSize={11} fontWeight={600} style={{ fill: "var(--ap-bg)" }}>
                Today
              </text>
            </g>
          )}

          <g style={{ fill: "var(--ap-muted)" }} fontSize={11.5}>
            {Array.from({ length: max / step + 1 }, (_, k) => k * step).map((t) => (
              <text key={t} x={pad.l - 8} y={y(t) + 4} textAnchor="end">
                {t}
              </text>
            ))}
            {[0, 0.5, 1].map((k) => (
              <text key={k} x={W - pad.r + 8} y={yk(k) + 4}>
                {k.toFixed(1)}
              </text>
            ))}
            <text x={pad.l - 8} y={pad.t - 10} textAnchor="end" fontSize={10.5}>
              mm
            </text>
            <text x={W - pad.r + 8} y={pad.t - 10} fontSize={10.5}>
              Kc
            </text>
            {ticks.map(({ d, i }) =>
              i === 0 || slot * 28 > 40 ? (
                <text key={d.date} x={pad.l + i * slot} y={H - 8}>
                  {fmt(d.date, { month: "short" })}
                  {i === 0 || d.date.slice(5, 7) === "01" ? ` ${d.date.slice(0, 4)}` : ""}
                </text>
              ) : null,
            )}
          </g>
        </svg>
      </div>

      <span className="flex flex-wrap items-center gap-4 text-[11.5px] text-muted">
        {(Object.keys(SOURCE) as EtcDay["source"][]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: ETC, opacity: SOURCE[k].opacity }} />
            {SOURCE[k].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-[1.75px] border-dashed border-[var(--ap-text)] opacity-70" />
          Kc (right axis)
        </span>
        <span className="ml-auto">
          {real} of {n} days from real weather, the rest from 1996–2025 averages
        </span>
      </span>
    </Panel>
  );
}

/* ── Season plan ─────────────────────────────────────────────────────── */

function SeasonPlan({
  plan,
  crop,
  sowDate,
  normals,
  rainfed,
}: {
  plan: ReturnType<typeof seasonPlan>;
  crop: CalendarCrop;
  sowDate: string;
  /** The years the station's averages span, e.g. "1996–2025". */
  normals: string;
  rainfed: boolean;
}) {
  const max = Math.max(...plan.map((m) => Math.max(m.etc, m.rain)), 1);
  const etc = plan.reduce((a, m) => a + m.etc, 0);
  const rain = plan.reduce((a, m) => a + m.rain, 0);
  const need = plan.reduce((a, m) => a + m.need, 0);
  // A rainfed field has no system losses to allow for; quote it as if on drip.
  const gross = rainfed ? need / EFFICIENCY.drip : plan.reduce((a, m) => a + m.gross, 0);
  const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <Panel className="flex flex-col gap-4 px-5 py-5">
      <span className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-lg font-semibold">Season plan</span>
          {plan.length > 0 && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[12.5px] font-semibold tabular-nums">
              {MONTH[plan[0].month]} {plan[0].year} – {MONTH[plan[plan.length - 1].month]} {plan[plan.length - 1].year}
            </span>
          )}
        </span>
        <span className="text-[13px] text-muted">
          {crop.name} sown {fmt(sowDate, { day: "numeric", month: "short", year: "numeric" })}. Crop water use (ETc) is worked out on
          the {normals} average year, laid on these calendar months.
        </span>
      </span>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Metric
          label="Crop water use (ETc)"
          value={Math.round(etc).toString()}
          unit="mm"
          note={plan.length ? `${plan[0].year === plan[plan.length - 1].year ? plan[0].year : `${plan[0].year}–${plan[plan.length - 1].year}`} season` : "over the season"}
          color={ETC}
        />
        <Metric label="Useful rain" value={Math.round(rain).toString()} unit="mm" note="effective rainfall" color={RAIN} />
        <Metric label="Shortfall" value={Math.round(need).toString()} unit="mm" note={`${Math.round((need / (etc || 1)) * 100)}% of its need`} color={WATER} />
        <Metric
          label={rainfed ? "Would need" : "To irrigate"}
          value={Math.round(gross).toString()}
          unit="mm"
          note={rainfed ? "if irrigated by drip" : `≈ ${Math.round(gross * 10)} m³/ha`}
          color={WATER}
        />
      </div>

      <div className="flex h-[180px] items-end gap-2 pt-2">
        {plan.map((m, i) => (
          <div key={m.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: m.need > 0 ? WATER : "var(--ap-muted)" }}>
              {m.need > 0.5 ? `${Math.round(rainfed ? m.need / EFFICIENCY.drip : m.gross)}` : "—"}
            </span>
            <div className="relative flex w-full flex-1 items-end justify-center gap-[3px]">
              <motion.span
                className="w-[38%] max-w-[18px] rounded-t-[4px]"
                style={{ background: ETC }}
                initial={{ height: 0 }}
                animate={{ height: `${(m.etc / max) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: EASE }}
                title={`${MONTH[m.month]} ${m.year} · crop water use (ETc) ${Math.round(m.etc)} mm`}
              />
              <motion.span
                className="w-[38%] max-w-[18px] rounded-t-[4px]"
                style={{ background: RAIN, opacity: 0.85 }}
                initial={{ height: 0 }}
                animate={{ height: `${(m.rain / max) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.05 + i * 0.05, ease: EASE }}
                title={`${MONTH[m.month]} ${m.year} · useful rain ${Math.round(m.rain)} mm`}
              />
            </div>
            <span className="flex flex-col items-center leading-tight">
              <span className="text-[11.5px] text-muted">{MONTH[m.month]}</span>
              {/* The year under the first month and under every January. */}
              <span className="h-3.5 text-[10.5px] font-semibold text-faint tabular-nums">
                {i === 0 || m.month === 0 ? m.year : ""}
              </span>
            </span>
          </div>
        ))}
      </div>
      <span className="flex flex-wrap gap-4 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: ETC }} />
          Crop water use (ETc)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: RAIN }} />
          Useful rain
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-semibold" style={{ color: WATER }}>
            12
          </span>
          Irrigation to apply that month, mm
        </span>
      </span>
    </Panel>
  );
}
