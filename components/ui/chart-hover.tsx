"use client";

import * as React from "react";

/**
 * Hover readouts for the bar charts.
 *
 * These used to be native SVG `<title>` tooltips, but React 19 treats
 * `<title>` as document metadata and deduplicates it against the page title,
 * so every one of them rendered empty and the charts had no tooltips at all.
 *
 * Reading the index off the pointer position also beats one listener per bar
 * — the SPEI chart has 360 of them — and a styled readout appears instantly
 * instead of waiting on the OS tooltip delay.
 */

export interface BarHover {
  index: number | null;
  /** 0–1 across the plot area, for positioning the readout and the guide. */
  fraction: number;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
}

/**
 * @param count  number of bars
 * @param left   left padding in viewBox units
 * @param right  right padding in viewBox units
 * @param width  total viewBox width
 */
export function useBarHover(count: number, left: number, right: number, width: number): BarHover {
  const [state, setState] = React.useState<{ index: number | null; fraction: number }>({
    index: null,
    fraction: 0,
  });

  const onMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width) return;
      // Pointer position in viewBox units, then into the plot area.
      const vx = ((e.clientX - rect.left) / rect.width) * width;
      const span = width - left - right;
      const t = (vx - left) / span;
      if (t < 0 || t > 1) {
        setState({ index: null, fraction: 0 });
        return;
      }
      // t === 1 at the right edge would floor to `count`, so clamp.
      const index = Math.min(count - 1, Math.floor(t * count));
      setState({ index, fraction: (index + 0.5) / count });
    },
    [count, left, right, width],
  );

  const onMouseLeave = React.useCallback(() => setState({ index: null, fraction: 0 }), []);

  return { ...state, onMouseMove, onMouseLeave };
}

/** The floating readout itself, positioned over the plot area. */
export function HoverReadout({
  hover,
  left,
  right,
  width,
  children,
}: {
  hover: BarHover;
  left: number;
  right: number;
  width: number;
  children: React.ReactNode;
}) {
  if (hover.index == null) return null;
  const span = width - left - right;
  const pct = ((left + hover.fraction * span) / width) * 100;

  return (
    <div
      className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-inset border border-panel-border bg-s2 px-2 py-1 font-mono text-[10.5px] text-ink shadow-pop"
      style={{
        left: `${pct}%`,
        // Keep the readout inside the panel at the extremes.
        transform: `translateX(${pct > 88 ? "-92%" : pct < 12 ? "-8%" : "-50%"})`,
      }}
    >
      {children}
    </div>
  );
}

/** A vertical guide at the hovered bar, drawn inside the SVG. */
export function HoverGuide({
  hover,
  left,
  right,
  width,
  top,
  bottom,
}: {
  hover: BarHover;
  left: number;
  right: number;
  width: number;
  top: number;
  bottom: number;
}) {
  if (hover.index == null) return null;
  const x = left + hover.fraction * (width - left - right);
  return (
    <line
      x1={x}
      x2={x}
      y1={top}
      y2={bottom}
      style={{ stroke: "var(--ap-text)", strokeOpacity: 0.35 }}
      strokeWidth={1}
      pointerEvents="none"
    />
  );
}
