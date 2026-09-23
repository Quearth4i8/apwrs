import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Risk bands are shared by the badge, the map ramp and every chart. */
export type RiskLevel = "safe" | "watch" | "severe" | "extreme";

export function riskLevel(score: number): RiskLevel {
  if (score < 25) return "safe";
  if (score < 50) return "watch";
  if (score < 75) return "severe";
  return "extreme";
}

export const RISK_COLOR: Record<RiskLevel, string> = {
  safe: "#38A88A",
  watch: "#E7A83B",
  severe: "#EE8434",
  extreme: "#D96565",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  safe: "Safe",
  watch: "Watch",
  severe: "Severe",
  extreme: "Extreme",
};

export function riskColor(score: number) {
  return RISK_COLOR[riskLevel(score)];
}

/** NDVI ramp, from MapView.dc.html. */
export function ndviColor(v: number) {
  if (v < 0.2) return "#9C7A45";
  if (v < 0.3) return "#B8A04A";
  if (v < 0.4) return "#7FB24E";
  if (v < 0.5) return "#4CAF5A";
  return "#2E9B55";
}

/** Build an SVG polyline path from [x, y] pairs. */
export function linePath(points: readonly (readonly [number, number])[]) {
  return "M" + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L");
}
