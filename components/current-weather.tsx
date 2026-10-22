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
          ? [0, 1, 2, 3].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-[14px] bg-neutral-100" />)
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
}: {
  index: number;
  icon: IconName;
  color: string;
  label: string;
  value: number | null;
  digits: number;
  unit: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: EASE }}
      className="flex flex-col gap-1.5 overflow-hidden rounded-[14px] bg-neutral-100 px-3.5 py-3"
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
