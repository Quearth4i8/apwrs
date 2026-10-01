"use client";

import * as React from "react";
import { cn, riskLevel, RISK_COLOR, RISK_LABEL, type RiskLevel } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────
   Panel — the single container every card, figure and dialog uses.

   This replaced the design system's "blueprint" frame: square corners with
   "+" registration marks at each one. Those read as drafting marks rather
   than interface, and four of them on every card is a lot of visual noise
   carrying no information. A panel is an edged surface instead — soft
   radius, hairline border, a hint of elevation — so the content leads and
   the container recedes.
   ───────────────────────────────────────────────────────────────────── */

export const Panel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    hoverable?: boolean;
    /** Clip children to the rounded edge (tables, maps, full-bleed rows). */
    clip?: boolean;
  }
>(function Panel({ className, children, hoverable, clip = true, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("panel", clip && "overflow-hidden", hoverable && "panel-hover", className)}
      {...props}
    >
      {children}
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────────────────
   Buttons — square corners, hairline border. The primary is the one solid
   object on the board and carries the registration marks.
   ───────────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control " +
  "font-heading text-[14px] font-semibold leading-tight " +
  "transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border border-accent bg-accent text-bg shadow-[0_1px_2px_rgb(0_0_0/0.18)] hover:bg-accent-600 active:bg-accent-700",
  secondary:
    "border border-divider text-ink hover:border-divider-strong hover:bg-neutral-100 active:bg-[color-mix(in_srgb,var(--ap-text)_14%,transparent)]",
  ghost:
    "border border-transparent text-accent hover:bg-accent-100 active:bg-[color-mix(in_srgb,var(--ap-accent)_18%,transparent)]",
  danger:
    "border border-transparent text-extreme-ink hover:bg-[rgb(217_101_101_/_0.12)]",
};

export interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", children, ...props },
  ref,
) {
  const sizing =
    size === "sm" ? "h-[30px] px-3 text-[12.5px]" : size === "lg" ? "h-11 px-5 text-[15px]" : "h-9 px-3.5";
  return (
    <button ref={ref} className={cn(BUTTON_BASE, BUTTON_VARIANT[variant], sizing, className)} {...props}>
      {children}
    </button>
  );
});

/** Same surface as Button, for real links. */
export const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }
>(function ButtonLink({ className, variant = "secondary", size = "md", children, ...props }, ref) {
  const sizing =
    size === "sm" ? "h-[30px] px-3 text-[12.5px]" : size === "lg" ? "h-11 px-5 text-[15px]" : "h-9 px-3.5";
  return (
    <a
      ref={ref}
      className={cn(BUTTON_BASE, BUTTON_VARIANT[variant], sizing, "no-underline", className)}
      {...props}
    >
      {children}
    </a>
  );
});

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { label: string }
>(function IconButton({ className, label, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-8 flex-none place-items-center rounded-control border border-divider text-ink",
        "transition-colors duration-150 hover:border-divider-strong hover:bg-neutral-100",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

/* ─────────────────────────────────────────────────────────────────────────
   Risk badge — the shared 0-100 vocabulary (RiskBadge.dc.html).
   ───────────────────────────────────────────────────────────────────── */

const BADGE_TINT: Record<RiskLevel, { border: string; bg: string; ink: string }> = {
  safe: { border: "rgb(56 168 138 / 0.4)", bg: "rgb(56 168 138 / 0.1)", ink: "#38A88A" },
  watch: { border: "rgb(231 168 59 / 0.45)", bg: "rgb(231 168 59 / 0.1)", ink: "#E7A83B" },
  severe: { border: "rgb(238 132 52 / 0.45)", bg: "rgb(238 132 52 / 0.11)", ink: "#EE8434" },
  extreme: { border: "rgb(217 101 101 / 0.5)", bg: "rgb(217 101 101 / 0.12)", ink: "#E07B7B" },
};

export function RiskBadge({
  score,
  level,
  showScore = true,
  className,
}: {
  score?: number;
  level?: RiskLevel;
  showScore?: boolean;
  className?: string;
}) {
  const lv = level ?? riskLevel(score ?? 58);
  const tint = BADGE_TINT[lv];
  const withScore = showScore && level == null && score != null;
  return (
    <span
      className={cn(
        "inline-flex h-[24px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5",
        "text-[12.5px] font-semibold tabular-nums",
        className,
      )}
      style={{ background: tint.bg, color: tint.ink }}
    >
      <span className="size-1.5 flex-none rounded-full" style={{ background: RISK_COLOR[lv] }} />
      {RISK_LABEL[lv]}
      {withScore && <span className="opacity-75">{Math.round(score)}</span>}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Small shared pieces.
   ───────────────────────────────────────────────────────────────────── */

export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[13px] text-muted", className)}>{children}</span>
  );
}

/**
 * Page title, a plain one-line lede and actions. `kicker` is accepted for
 * older call sites but not drawn: it repeated the top bar's breadcrumb.
 */
export function PageHeader({
  title,
  lede,
  actions,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[clamp(28px,4vw,36px)] leading-none tracking-[-0.02em]">{title}</h1>
        {lede && <div className="max-w-[120ch] text-[14.5px] text-muted">{lede}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/** A horizontal switch row: the pill group used across filters and settings. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: React.ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn(
        "flex gap-0.5 rounded-full bg-neutral-100 p-[3px]",
        size === "sm" ? "h-[32px]" : "h-[36px]",
        className,
      )}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors duration-150",
              on ? "bg-s2 font-semibold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.18)]" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** The drawn toggle used for overlays, alert rules and SMS opt-in. */
export function Toggle({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-4 w-[30px] flex-none rounded-full border transition-colors duration-150", className)}
      style={{
        borderColor: checked ? "var(--ap-accent)" : "var(--ap-divider-strong)",
        background: checked ? "var(--ap-accent-100)" : "transparent",
      }}
    >
      <span
        className="absolute top-[2px] size-2.5 rounded-full transition-[left] duration-150 ease-out"
        style={{ left: checked ? 16 : 2, background: checked ? "var(--ap-accent)" : "var(--ap-muted)" }}
      />
    </button>
  );
}

export function Stat({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 px-3 py-2.5", className)}>
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="text-[17px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/** Underlined tab strip (risk, alerts, history, datasets, admin). */
export function TabStrip<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: readonly { value: T; label: React.ReactNode; count?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-neutral-100 p-1 no-scrollbar", className)} role="tablist">
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-[13.5px] transition-colors duration-150",
              on ? "bg-s2 font-semibold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.18)]" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count != null && <span className="ml-2 text-[12px] font-normal text-muted">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-xs text-[color-mix(in_srgb,var(--ap-text)_70%,transparent)]">
        <span>
          {label} {required && <span className="text-extreme-ink">*</span>}
        </span>
        {hint && <span className="font-mono text-[10px] text-faint">{hint}</span>}
      </span>
      {children}
      {error && <span className="font-mono text-[10.5px] text-extreme-ink">{error}</span>}
    </label>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-control border border-divider bg-bg px-2.5 text-sm text-ink caret-accent",
          "transition-colors duration-150 placeholder:text-faint",
          "hover:border-[color-mix(in_srgb,var(--ap-text)_45%,transparent)]",
          "focus-visible:border-accent focus-visible:outline-offset-0",
          className,
        )}
        {...props}
      />
    );
  },
);

/** Input with a unit suffix — used all over the sensor and manual-entry forms. */
export function UnitInput({
  unit,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"input"> & { unit: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-9 items-center overflow-hidden rounded-control border border-divider bg-bg transition-colors duration-150",
        "focus-within:border-accent hover:border-divider-strong",
        className,
      )}
    >
      <input
        className="min-w-0 flex-1 border-0 bg-transparent px-2.5 font-mono text-[13px] text-ink outline-none placeholder:text-faint"
        {...props}
      />
      <span className="flex h-full items-center border-l border-divider px-2.5 font-mono text-[11px] text-muted">
        {unit}
      </span>
    </div>
  );
}
