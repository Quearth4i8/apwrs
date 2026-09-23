"use client";

import * as React from "react";
import { ndviColor, riskColor } from "@/lib/utils";

/**
 * The Ichkeul / Bizerte basin, generated rather than traced: a sine coast,
 * two lake blobs, contour rings and a 1 km risk grid whose score is a smooth
 * function of position. Ported from design/MapView.dc.html so the geometry
 * matches the mockups pixel for pixel.
 */

const coastY = (x: number) => 78 + 22 * Math.sin(x / 95) + 12 * Math.cos(x / 41 + 1);

function blob(cx: number, cy: number, rx: number, ry: number, seed: number) {
  const n = 18;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 1 + 0.12 * Math.sin(a * 3 + seed) + 0.07 * Math.cos(a * 5 + seed * 2);
    pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]);
  }
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    d +=
      (i ? "" : `M${((pts[n - 1][0] + p[0]) / 2).toFixed(1)} ${((pts[n - 1][1] + p[1]) / 2).toFixed(1)}`) +
      `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return d + "Z";
}

const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1.05;

const LAKES: [number, number, number, number][] = [
  [300, 305, 122, 68],
  [578, 225, 112, 62],
];

const COAST = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= 800; x += 20) pts.push(`${x} ${coastY(x).toFixed(1)}`);
  return "M" + pts.join("L");
})();
const LAND = COAST + "L800 500L0 500Z";

const CONTOURS = [
  blob(290, 400, 90, 40, 1),
  blob(290, 400, 60, 26, 2),
  blob(290, 400, 30, 12, 3),
  blob(720, 390, 70, 50, 4),
  blob(720, 390, 42, 30, 5),
  blob(140, 200, 80, 50, 6),
  blob(140, 200, 45, 26, 7),
];

const LAKE_I = blob(300, 305, 122, 68, 0.4);
const LAKE_B = blob(578, 225, 112, 62, 2.2);

/** Deterministic parcel rectangles for the satellite base. */
const FIELDS = (() => {
  let r = 7;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const out: { x: string; y: string; w: string; h: string; c: string }[] = [];
  for (let i = 0; i < 120; i++) {
    const x = rnd() * 800;
    const y = 90 + rnd() * 410;
    out.push({
      x: x.toFixed(0),
      y: y.toFixed(0),
      w: (20 + rnd() * 50).toFixed(0),
      h: (14 + rnd() * 34).toFixed(0),
      c: ["#1E2A1A", "#2A2A1C", "#18241A", "#252F1E", "#2E2B20"][Math.floor(rnd() * 5)],
    });
  }
  return out;
})();

export const SENSORS = [
  { id: "ICH-W01", x: 240, y: 392, st: "ok" },
  { id: "ICH-S02", x: 372, y: 400, st: "ok" },
  { id: "ICH-L03", x: 300, y: 232, st: "ok" },
  { id: "ICH-S04", x: 168, y: 296, st: "warn" },
  { id: "BIZ-W01", x: 660, y: 176, st: "ok" },
  { id: "BIZ-L02", x: 520, y: 286, st: "ok" },
  { id: "BIZ-S03", x: 706, y: 300, st: "off" },
  { id: "MAT-S01", x: 430, y: 440, st: "ok" },
] as const;

function score(x: number, y: number) {
  let s =
    26 +
    40 * (y / 500) +
    16 * (1 - x / 800) +
    12 * Math.sin(x / 70 + y / 55) +
    8 * Math.cos(x / 33 - y / 41);
  for (const [cx, cy, rx, ry] of LAKES) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d < 1.8) s -= (1.8 - d) * 14;
  }
  return Math.max(4, Math.min(96, s));
}

export interface MapCell {
  id: string;
  score: number;
  ndvi: number;
  lat: string;
  lon: string;
}

export interface MapViewProps {
  layer?: "risk" | "ndvi" | "none";
  base?: "topo" | "sat";
  sensors?: boolean;
  legend?: boolean;
  drawn?: boolean;
  water?: boolean;
  labels?: boolean;
  grid?: boolean;
  sensorIds?: boolean;
  opacity?: number;
  selected?: string | null;
  onCell?: (cell: MapCell) => void;
  className?: string;
}

export function MapView({
  layer = "risk",
  base = "topo",
  sensors = false,
  legend = false,
  drawn = false,
  water = true,
  labels = true,
  grid = true,
  sensorIds = true,
  opacity = 0.42,
  selected = null,
  onCell,
  className,
}: MapViewProps) {
  const cells = React.useMemo(() => {
    if (layer === "none") return [];
    const out: {
      id: string;
      x: number;
      y: number;
      fill: string;
      op: number;
      stroke: string;
      sw: number;
      cell: MapCell;
    }[] = [];
    for (let r = 0; r < 25; r++) {
      for (let q = 0; q < 40; q++) {
        const x = q * 20;
        const y = r * 20;
        const cx = x + 10;
        const cy = y + 10;
        if (cy < coastY(cx) + 4) continue;
        if (LAKES.some(([a, b, c, d]) => inEllipse(cx, cy, a, b, c * 0.8, d * 0.8))) continue;
        const s = score(cx, cy);
        const nd = Math.max(0.12, Math.min(0.62, 0.62 - s / 170 + 0.05 * Math.sin(cx / 50)));
        const id = `${q}-${r}`;
        out.push({
          id,
          x,
          y,
          fill: layer === "ndvi" ? ndviColor(nd) : riskColor(s),
          op: selected === id ? 0.9 : opacity,
          stroke: selected === id ? "#ffffff" : "none",
          sw: selected === id ? 2 : 0,
          cell: {
            id,
            score: Math.round(s),
            ndvi: +nd.toFixed(2),
            lat: (37.35 - cy / 1666).toFixed(3),
            lon: (9.55 + cx / 2000).toFixed(3),
          },
        });
      }
    }
    return out;
  }, [layer, opacity, selected]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 120,
        overflow: "hidden",
        background: "var(--ap-map-sea)",
      }}
    >
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        role="img"
        aria-label="Drought risk map of the Ichkeul and Bizerte basin"
      >
        <path d={LAND} style={{ fill: "var(--ap-map-land)" }} />

        {base === "sat" && (
          <g>
            {FIELDS.map((f, i) => (
              <rect key={i} x={f.x} y={f.y} width={f.w} height={f.h} fill={f.c} />
            ))}
          </g>
        )}

        {base === "topo" && (
          <g fill="none" style={{ stroke: "var(--ap-text)", strokeOpacity: 0.09 }}>
            {CONTOURS.map((d, i) => (
              <path key={i} d={d} strokeWidth={1} />
            ))}
          </g>
        )}

        <g>
          {cells.map((c) => (
            <rect
              key={c.id}
              x={c.x}
              y={c.y}
              width={19}
              height={19}
              fill={c.fill}
              fillOpacity={c.op}
              stroke={c.stroke}
              strokeWidth={c.sw}
              onClick={onCell ? () => onCell(c.cell) : undefined}
              style={{ cursor: onCell ? "pointer" : "default", transition: "fill-opacity .3s" }}
            />
          ))}
        </g>

        {water && (
          <g>
            <path
              d={LAKE_I}
              style={{ fill: "var(--ap-map-water)", stroke: "var(--ap-teal)", strokeOpacity: 0.55 }}
              strokeWidth={1}
            />
            <path
              d={LAKE_B}
              style={{ fill: "var(--ap-map-water)", stroke: "var(--ap-teal)", strokeOpacity: 0.55 }}
              strokeWidth={1}
            />
            <path
              d="M418 292 C 432 280, 446 268, 468 258"
              fill="none"
              style={{ stroke: "var(--ap-teal)", strokeOpacity: 0.6 }}
              strokeWidth={3}
            />
            <path
              d="M612 170 C 614 150, 612 130, 610 112"
              fill="none"
              style={{ stroke: "var(--ap-teal)", strokeOpacity: 0.6 }}
              strokeWidth={4}
            />
            <path
              d="M120 470 C 170 430, 190 380, 215 335"
              fill="none"
              style={{ stroke: "var(--ap-teal)", strokeOpacity: 0.35 }}
              strokeWidth={1.5}
            />
            <path
              d="M330 500 C 335 450, 322 410, 318 372"
              fill="none"
              style={{ stroke: "var(--ap-teal)", strokeOpacity: 0.35 }}
              strokeWidth={1.5}
            />
          </g>
        )}

        <path d={COAST} fill="none" style={{ stroke: "var(--ap-teal)", strokeOpacity: 0.5 }} strokeWidth={1} />

        {grid && (
          <g style={{ stroke: "var(--ap-text)", strokeOpacity: 0.1 }} strokeDasharray="2 4" strokeWidth={1}>
            <path d="M100 0V500M300 0V500M500 0V500M700 0V500M0 83H800M0 250H800M0 416H800" />
          </g>
        )}

        {drawn && (
          <g>
            <polygon
              points="470,340 565,322 615,392 545,452 458,420"
              style={{ fill: "var(--ap-teal)", fillOpacity: 0.1, stroke: "var(--ap-teal)" }}
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <g style={{ fill: "var(--ap-bg)", stroke: "var(--ap-teal)" }} strokeWidth={1.5}>
              <rect x={466} y={336} width={8} height={8} />
              <rect x={561} y={318} width={8} height={8} />
              <rect x={611} y={388} width={8} height={8} />
              <rect x={541} y={448} width={8} height={8} />
              <rect x={454} y={416} width={8} height={8} />
            </g>
          </g>
        )}

        {labels && (
          <g style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-text)" }} fontSize={11}>
            <text x={300} y={309} textAnchor="middle" fillOpacity={0.75} letterSpacing={1}>
              LAC ICHKEUL
            </text>
            <text x={578} y={229} textAnchor="middle" fillOpacity={0.75} letterSpacing={1}>
              LAC DE BIZERTE
            </text>
            <text x={80} y={40} fillOpacity={0.35} letterSpacing={3} fontSize={10}>
              MEDITERRANEAN SEA
            </text>
            <text x={626} y={150} fillOpacity={0.85}>
              Bizerte
            </text>
            <text x={440} y={326} fillOpacity={0.6} fontSize={10}>
              Menzel Bourguiba
            </text>
            <text x={455} y={484} fillOpacity={0.6} fontSize={10}>
              Mateur
            </text>
            <text x={104} y={494} fillOpacity={0.35} fontSize={9}>9.60°E</text>
            <text x={304} y={494} fillOpacity={0.35} fontSize={9}>9.70°E</text>
            <text x={504} y={494} fillOpacity={0.35} fontSize={9}>9.80°E</text>
            <text x={704} y={494} fillOpacity={0.35} fontSize={9}>9.90°E</text>
            <text x={6} y={79} fillOpacity={0.35} fontSize={9}>37.30°N</text>
            <text x={6} y={246} fillOpacity={0.35} fontSize={9}>37.20°N</text>
            <text x={6} y={412} fillOpacity={0.35} fontSize={9}>37.10°N</text>
          </g>
        )}

        {sensors && (
          <g>
            {SENSORS.map((s) => {
              const col = s.st === "ok" ? "#9EDFF1" : s.st === "warn" ? "#E7A83B" : "#D96565";
              return (
                <g key={s.id}>
                  <circle cx={s.x} cy={s.y} r={11} fill="none" stroke={col} strokeOpacity={0.35} />
                  <rect
                    x={s.x - 4}
                    y={s.y - 4}
                    width={8}
                    height={8}
                    fill={col}
                    style={{ stroke: "var(--ap-bg)" }}
                    strokeWidth={1.5}
                  />
                  {sensorIds && (
                    <text
                      x={s.x + 14}
                      y={s.y + 3}
                      fontSize={9.5}
                      style={{ fontFamily: "var(--font-mono)", fill: "var(--ap-text)" }}
                      fillOpacity={0.8}
                    >
                      {s.id}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {legend && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2.5 border border-divider bg-[color-mix(in_srgb,var(--ap-bg)_88%,transparent)] px-2.5 py-[7px] font-mono text-[10px] uppercase tracking-[0.06em] text-muted backdrop-blur-md">
          {(
            [
              ["Safe", "#38A88A"],
              ["Watch", "#E7A83B"],
              ["Severe", "#EE8434"],
              ["Extreme", "#D96565"],
            ] as const
          ).map(([l, c]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="size-2" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
