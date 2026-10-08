"use client";

import * as React from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Icon, type IconName } from "@/components/icon";
import { Panel } from "@/components/ui/primitives";
import { useCurrentWeather } from "@/lib/use-current";

/**
 * Conditions right now at the selected station — humidity, wind, pressure
 * and visibility — from Open-Meteo's current-weather block, with today's
 * hourly values as a small trend line on each. Refreshes every ten minutes.
 */

const EASE = [0.2, 0.8, 0.2, 1] as const;

export function CurrentWeatherCard({ stationId }: { stationId: string }) {
  const { data, error } = useCurrentWeather(stationId);

  const hourIdx = data ? Math.max(0, data.hourly.time.findIndex((t) => t.slice(0, 13) === data.time.slice(0, 13))) : 0;
  const at = data?.time.slice(11, 16);

  return (
    <Panel className="flex flex-col gap-4 px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Right now</span>
          <span className="text-[13px] text-muted">
            {data ? (
              <>
                {data.station.name} · {at} local
                {data.temperature != null && <> · {data.temperature.toFixed(1)} °C</>}
              </>
            ) : error ? (
              "Current conditions unavailable"
            ) : (
              "Reading the weather…"
            )}
          </span>
        </span>
        {data && (
          <span className="flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,#38A88A_12%,transparent)] px-2.5 py-1 text-[11.5px] font-semibold text-[#2E8F75]">
            <span className="relative grid size-2 place-items-center">
              <span className="absolute size-2 animate-ping rounded-full bg-[#38A88A] opacity-60" />
              <span className="size-2 rounded-full bg-[#38A88A]" />
            </span>
            Live
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {!data
          ? [0, 1, 2, 3].map((i) => <div key={i} className="h-[112px] animate-pulse rounded-[14px] bg-neutral-100" />)
          : [
              <Tile
                key="rh"
                index={0}
                icon="droplet"
                color="#2BA6B8"
                label="Humidity"
                value={data.humidity}
                digits={0}
                unit="%"
                note={humidityWord(data.humidity)}
                series={data.hourly.humidity}
                hour={hourIdx}
              />,
              <Tile
                key="wind"
                index={1}
                icon="wind"
                color="#7B8FD9"
                label="Wind speed"
                value={data.wind}
                digits={1}
                unit="km/h"
                note={
                  <span className="flex items-center gap-1.5">
                    {data.windDir != null && <WindArrow from={data.windDir} />}
                    {data.windDir != null ? `from ${compass(data.windDir)}` : "—"}
                    {data.gusts != null && <span className="text-faint">· gusts {Math.round(data.gusts)}</span>}
                  </span>
                }
                series={data.hourly.wind}
                hour={hourIdx}
              />,
              <Tile
                key="p"
                index={2}
                icon="gauge"
                color="#E7A83B"
                label="Pressure"
                value={data.pressure}
                digits={0}
                unit="hPa"
                note={pressureWord(data.hourly.pressure, hourIdx)}
                series={data.hourly.pressure}
                hour={hourIdx}
              />,
              <Tile
                key="vis"
                index={3}
                icon="eye"
                color="#38A88A"
                label="Visibility"
                value={data.visibility == null ? null : data.visibility / 1000}
                digits={data.visibility != null && data.visibility < 10_000 ? 1 : 0}
                unit="km"
                note={visibilityWord(data.visibility)}
                series={data.hourly.visibility.map((v) => (v == null ? null : v / 1000))}
                hour={hourIdx}
              />,
            ]}
      </div>
    </Panel>
  );
}

/* ── A tile ──────────────────────────────────────────────────────────── */

function Tile({
  index,
  icon,
  color,
  label,
  value,
  digits,
  unit,
  note,
  series,
  hour,
}: {
  index: number;
  icon: IconName;
  color: string;
  label: string;
  value: number | null;
  digits: number;
  unit: string;
  note: React.ReactNode;
  series: (number | null)[];
  hour: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: EASE }}
      className="flex flex-col gap-1.5 overflow-hidden rounded-[14px] bg-neutral-100 px-3.5 pb-2 pt-3"
    >
      <span className="flex items-center gap-2 text-[12px] text-muted">
        <span
          className="grid size-6 place-items-center rounded-[7px]"
          style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          <Icon name={icon} size={13} strokeWidth={2} />
        </span>
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="text-[24px] font-semibold leading-none tabular-nums">
          {value == null ? "—" : <CountUp value={value} digits={digits} />}
        </span>
        <span className="text-[12px] text-muted">{unit}</span>
      </span>
      <span className="truncate text-[11.5px] text-muted">{note}</span>
      <Spark series={series} hour={hour} color={color} delay={0.2 + index * 0.07} />
    </motion.div>
  );
}

function CountUp({ value, digits }: { value: number; digits: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => v.toFixed(digits));
  React.useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: EASE });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

/** Today, hour by hour: solid up to now, dashed for the hours still to come. */
function Spark({ series, hour, color, delay }: { series: (number | null)[]; hour: number; color: string; delay: number }) {
  const vals = series.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (vals.length < 2) return <span className="h-7" />;
  const lo = Math.min(...vals.map((p) => p.v));
  const hi = Math.max(...vals.map((p) => p.v));
  const n = Math.max(1, series.length - 1);
  const X = (i: number) => (i / n) * 100;
  const Y = (v: number) => 24 - ((v - lo) / (hi - lo || 1)) * 20;
  const path = (pts: { v: number; i: number }[]) => pts.map((p, k) => `${k ? "L" : "M"}${X(p.i).toFixed(2)} ${Y(p.v).toFixed(2)}`).join("");
  const past = vals.filter((p) => p.i <= hour);
  const next = vals.filter((p) => p.i >= hour);
  const now = vals.find((p) => p.i === hour) ?? past[past.length - 1];

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-0.5 block h-7 w-full overflow-visible">
      <motion.path
        d={path(past)}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      />
      {next.length > 1 && (
        <motion.path
          d={path(next)}
          fill="none"
          stroke={color}
          strokeOpacity={0.45}
          strokeWidth={1.5}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.8 }}
        />
      )}
      {now && (
        <motion.circle
          cx={X(now.i)}
          cy={Y(now.v)}
          r={2.6}
          fill={color}
          stroke="var(--ap-surface)"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.7 }}
        />
      )}
    </svg>
  );
}

/** Points where the wind blows to — the opposite of where it comes from. */
function WindArrow({ from }: { from: number }) {
  return (
    <motion.span
      className="inline-grid size-4 place-items-center rounded-full bg-[color-mix(in_srgb,#7B8FD9_18%,transparent)] text-[#5568B8]"
      initial={{ rotate: 0 }}
      animate={{ rotate: from + 180 }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <svg width={10} height={10} viewBox="0 0 10 10">
        <path d="M5 1 L8 8 L5 6.4 L2 8 Z" fill="currentColor" />
      </svg>
    </motion.span>
  );
}

/* ── Words for the numbers ───────────────────────────────────────────── */

function compass(deg: number) {
  const pts = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return pts[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

function humidityWord(v: number | null) {
  if (v == null) return "—";
  if (v < 30) return "Very dry air";
  if (v < 45) return "Dry air";
  if (v < 65) return "Comfortable";
  if (v < 85) return "Humid";
  return "Very humid";
}

/** Rising, steady or falling over the last three hours. */
function pressureWord(series: (number | null)[], hour: number) {
  const now = series[hour];
  const before = series[Math.max(0, hour - 3)];
  if (now == null || before == null || hour === 0) return now == null ? "—" : "Today's trend below";
  const d = now - before;
  if (d > 1) return `Rising · +${d.toFixed(1)} in 3 h`;
  if (d < -1) return `Falling · ${d.toFixed(1)} in 3 h`;
  return "Steady over 3 h";
}

function visibilityWord(m: number | null) {
  if (m == null) return "—";
  if (m >= 20_000) return "Excellent";
  if (m >= 10_000) return "Good";
  if (m >= 4_000) return "Moderate";
  if (m >= 1_000) return "Poor";
  return "Fog";
}
