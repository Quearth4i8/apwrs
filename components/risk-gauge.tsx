"use client";

import * as React from "react";
import { useMotionValueEvent, useSpring } from "motion/react";
import { loadGrid, type GridPayload } from "@/components/map-view";
import { Panel, RiskBadge } from "@/components/ui/primitives";
import { CardTitle } from "@/components/ui/simple";
import { cellFor, impactsAt } from "@/lib/impact";
import { RISK_COLOR, riskLevel } from "@/lib/utils";

/**
 * The drought risk at one place, as a needle on a 0–100 dial, and what it is
 * made of.
 *
 * It is the same number the Live Map paints (lib/risk.ts): each impact factor
 * is min–max normalised across the region by direction, weighted by the
 * entropy weight method, and the weighted dryness is the score. So a factor's
 * share of the score is its weight × how dry this cell is on that factor,
 * relative to the rest of the region today. Those shares add up to the needle.
 */

const FACTOR_COLOR: Record<string, string> = {
  ndvi: "#38A88A",
  spei3: "#2F7FD1",
  spi3: "#7B8FD9",
  soilMoisture: "#2BA6B8",
  tmax: "#E0663F",
  precip30: "#5B9BD5",
  et030: "#E7A83B",
};

/** How each factor's own value reads. */
const FORMAT: Record<string, (v: number) => string> = {
  ndvi: (v) => v.toFixed(2),
  spei3: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`,
  spi3: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`,
  soilMoisture: (v) => `${(v * 100).toFixed(0)}% vol`,
  tmax: (v) => `${v.toFixed(1)} °C`,
  precip30: (v) => `${v.toFixed(0)} mm`,
  et030: (v) => `${v.toFixed(0)} mm`,
};

export function RiskGauge({ lat, lon }: { lat: number; lon: number }) {
  const [payload, setPayload] = React.useState<GridPayload | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    loadGrid()
      .then((d) => live && setPayload(d))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, []);

  const cell = payload ? cellFor(payload, lat, lon) : null;
  const score = payload && cell != null ? payload.grid.risk[cell] : null;
  const impacts = payload && cell != null ? impactsAt(payload, cell) : [];
  const ranked = [...impacts].sort((a, b) => b.points - a.points);

  return (
    <Panel className="flex flex-col gap-4 px-6 py-5">
      <CardTitle title="Drought risk indicator" />

      {score == null ? (
        <div className="grid flex-1 place-items-center py-16 text-[13.5px] text-muted">
          {error ? "The risk surface is unavailable right now." : payload ? "No land cell here." : "Working it out…"}
        </div>
      ) : (
        <>
          <Dial score={score} />

          {/* The score, split into what each factor adds. */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-semibold">Impact factors</span>
              <span className="text-[12px] text-muted">impact · weight</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-neutral-100">
              {ranked.map((f) => (
                <span
                  key={f.key}
                  title={`${f.label} · ${f.impact.toFixed(0)}% of the score`}
                  style={{ width: `${f.points}%`, background: FACTOR_COLOR[f.key] ?? "var(--ap-accent)" }}
                />
              ))}
            </div>
            <div className="flex flex-col">
              {ranked.map((f) => (
                <div
                  key={f.key}
                  className="grid grid-cols-[10px_minmax(0,1fr)_auto_44px_40px] items-center gap-2.5 border-b border-divider py-2 text-[13px] last:border-b-0"
                >
                  <span className="size-2.5 rounded-full" style={{ background: FACTOR_COLOR[f.key] ?? "var(--ap-accent)" }} />
                  <span className="truncate" title={f.stand ? `${f.label} — stands in for land surface temperature` : f.label}>
                    {f.label}
                    {f.stand && <span className="text-faint"> *</span>}
                  </span>
                  <span className="text-[12.5px] text-muted tabular-nums">
                    {f.value == null ? "—" : (FORMAT[f.key]?.(f.value) ?? f.value.toFixed(2))}
                  </span>
                  <span className="text-right font-semibold tabular-nums">{f.impact.toFixed(0)}%</span>
                  <span className="text-right text-[12px] text-faint tabular-nums">{(f.weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <span className="text-[11.5px] leading-[1.4] text-faint">
              Impact = wₖ·dₖ ÷ Σ wⱼ·dⱼ: each factor&apos;s entropy weight times how dry this place is on it, as a share of the score.
            </span>
            {impacts.some((f) => f.stand) && (
              <span className="text-[11.5px] leading-[1.4] text-faint">* stands in for a satellite measurement not yet connected</span>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

/** A half dial, 0 on the left to 100 on the right, banded by risk level. */
function Dial({ score }: { score: number }) {
  const W = 300;
  const R = 120;
  const cx = W / 2;
  const cy = 136;
  const angle = (v: number) => Math.PI * (1 - v / 100); // 0 → left, 100 → right
  const pt = (v: number, r: number) => [cx + r * Math.cos(angle(v)), cy - r * Math.sin(angle(v))] as const;
  const arc = (from: number, to: number) => {
    const [x0, y0] = pt(from, R);
    const [x1, y1] = pt(to, R);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const bands: [number, number][] = [
    [0, 25],
    [25, 50],
    [50, 75],
    [75, 100],
  ];
  const level = riskLevel(score);

  // Rotation about the hub, written as a plain SVG transform attribute so the
  // pivot is exact. Motion would take over a `transform` handed to a motion
  // element and drop it, so the spring only drives a number here.
  const target = (score / 100) * 180 - 90;
  const rot = useSpring(-90, { stiffness: 60, damping: 12 });
  const [needleDeg, setNeedleDeg] = React.useState(-90);
  useMotionValueEvent(rot, "change", setNeedleDeg);
  React.useEffect(() => rot.set(target), [rot, target]);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} 160`} className="block w-full max-w-[340px]" role="img" aria-label={`Drought risk ${score} out of 100`}>
        {bands.map(([a, b]) => (
          <path
            key={a}
            d={arc(a + 0.8, b - 0.8)}
            fill="none"
            stroke={RISK_COLOR[riskLevel(a)]}
            strokeWidth={18}
            strokeLinecap="butt"
            opacity={riskLevel(a) === level ? 1 : 0.35}
          />
        ))}
        <g style={{ fill: "var(--ap-muted)" }} fontSize={11} textAnchor="middle">
          {[0, 25, 50, 75, 100].map((t) => {
            const [x, y] = pt(t, R - 26);
            return (
              <text key={t} x={x} y={y + 4}>
                {t}
              </text>
            );
          })}
        </g>

        {/* The needle swings in from zero. */}
        <g transform={`rotate(${needleDeg.toFixed(2)} ${cx} ${cy})`}>
          <path d={`M${cx - 4} ${cy} L${cx} ${cy - R + 8} L${cx + 4} ${cy} Z`} style={{ fill: "var(--ap-text)" }} />
        </g>
        <circle cx={cx} cy={cy} r={9} style={{ fill: "var(--ap-text)" }} />
        <circle cx={cx} cy={cy} r={3.5} style={{ fill: "var(--ap-surface)" }} />
      </svg>
      <span className="-mt-1 text-[44px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{score}</span>
      <span className="mt-1 text-[12px] text-muted">out of 100</span>
      <RiskBadge level={level} showScore={false} className="mt-2" />
    </div>
  );
}
