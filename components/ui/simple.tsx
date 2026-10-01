"use client";

import * as React from "react";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * The plain-language building blocks: one icon, one label, one value, and at
 * most one short line of context. Figures that need an index name or a unit
 * explained belong on the analysis pages, not here.
 */

export function InfoTile({
  icon,
  tint,
  label,
  value,
  note,
  className,
}: {
  icon: IconName;
  /** Colour of the icon and its tile. */
  tint: string;
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel flex flex-col items-center gap-2 px-4 py-5 text-center", className)}>
      <span
        className="grid size-10 place-items-center rounded-[10px]"
        style={{ color: tint, background: `color-mix(in srgb, ${tint} 14%, transparent)` }}
      >
        <Icon name={icon} size={20} strokeWidth={1.8} />
      </span>
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[26px] font-semibold leading-none tabular-nums">{value}</span>
      {note && <span className="text-[12.5px] leading-snug text-muted">{note}</span>}
    </div>
  );
}

/* ── Soil moisture levels ────────────────────────────────────────────── */

export type MoistureLevel = "dry" | "good" | "wet";

/**
 * Bands on the probe's 0–100 % calibration span. SmartFarm draws the same
 * Critical / Optimal / Full scale; these cut points follow its gauge.
 */
export function moistureLevel(pct: number): MoistureLevel {
  if (pct < 35) return "dry";
  if (pct <= 75) return "good";
  return "wet";
}

export const MOISTURE_LABEL: Record<MoistureLevel, string> = { dry: "Dry", good: "Good", wet: "Wet" };
export const MOISTURE_COLOR: Record<MoistureLevel, string> = {
  dry: "#D96565",
  good: "#38A88A",
  wet: "var(--ap-accent)",
};

/** A Dry → Good → Wet bar with a marker at `pct`. */
export function LevelBar({ pct, className }: { pct: number | null; className?: string }) {
  return (
    <div className={cn("relative h-2.5 rounded-full", className)}>
      <div
        className="absolute inset-0 rounded-full opacity-80"
        style={{
          background: "linear-gradient(to right, #D96565 0%, #E7A83B 22%, #38A88A 45%, #38A88A 62%, #2BA6B8 85%)",
        }}
      />
      {pct != null && (
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--ap-bg)] shadow"
          style={{ left: `${Math.min(100, Math.max(0, pct))}%`, background: MOISTURE_COLOR[moistureLevel(pct)] }}
        />
      )}
    </div>
  );
}

export function LevelPill({ level }: { level: MoistureLevel }) {
  const c = MOISTURE_COLOR[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold"
      style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {MOISTURE_LABEL[level]}
    </span>
  );
}

/**
 * A left-aligned figure tile: label (with an optional icon), a large value
 * with its unit, an optional badge, and one short note. Tiles sit apart in a
 * gap grid rather than fused into one ruled strip.
 */
export function StatTile({
  icon,
  tint = "var(--ap-accent)",
  label,
  value,
  unit,
  badge,
  note,
  className,
}: {
  icon?: IconName;
  tint?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  badge?: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel flex flex-col gap-2.5 px-4.5 py-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] text-muted">
          {icon && (
            <span
              className="grid size-7 flex-none place-items-center rounded-[8px]"
              style={{ color: tint, background: `color-mix(in srgb, ${tint} 14%, transparent)` }}
            >
              <Icon name={icon} size={15} strokeWidth={1.8} />
            </span>
          )}
          {label}
        </span>
        {badge}
      </div>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[30px] font-semibold leading-none tracking-[-0.01em] tabular-nums">{value}</span>
        {unit && <span className="text-[13px] text-muted">{unit}</span>}
      </span>
      {note && <span className="text-[12.5px] leading-snug text-muted">{note}</span>}
    </div>
  );
}

/** Card heading: a title and an optional quiet line beside or below it. */
export function CardTitle({
  title,
  sub,
  right,
  className,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2", className)}>
      <div className="flex flex-col gap-0.5">
        <span className="text-[16px] font-semibold leading-tight">{title}</span>
        {sub && <span className="text-[13px] text-muted">{sub}</span>}
      </div>
      {right}
    </div>
  );
}
