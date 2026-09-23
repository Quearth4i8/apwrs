"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Blueprint, Button, PageHeader } from "@/components/ui/primitives";
import { COLUMN_MAP, METRIC_GROUPS, VALIDATION_ROWS } from "@/lib/data";

const STEPS = [
  ["Select file", "Type & source"],
  ["Map columns", "8 columns"],
  ["Validate", "Preview & fix"],
  ["Import", "Progress"],
] as const;

export function PageUpload() {
  const { site } = useConsole();
  const [step, setStep] = React.useState(1);
  const [group, setGroup] = React.useState("soil");
  const [file, setFile] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  function startImport() {
    setStep(4);
    setProgress(0);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 3 + Math.random() * 5);
        if (next >= 100 && timer.current) clearInterval(timer.current);
        return next;
      });
    }, 120);
  }

  const pct = Math.round(progress);
  const done = Math.round((progress / 100) * 4310).toLocaleString("en-US");

  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={
          <>
            DATA &middot; UPLOAD &middot; {site.cc} / {site.name}
          </>
        }
        title="Upload data"
      />

      {/* ── Stepper ───────────────────────────────────────────────────── */}
      <Blueprint className="grid grid-cols-2 xl:grid-cols-4">
        {STEPS.map(([l, d], i) => {
          const n = i + 1;
          const isDone = step > n;
          const on = step === n;
          return (
            <button
              key={l}
              onClick={() => (isDone || on) && setStep(n)}
              disabled={!isDone && !on}
              className="flex items-center gap-3 border-b border-r border-divider px-4.5 py-3.5 text-left disabled:cursor-default xl:border-b-0 xl:last:border-r-0"
              style={{ boxShadow: `inset 0 -2px 0 ${on ? "var(--ap-accent)" : "transparent"}` }}
            >
              <span
                className="grid size-6.5 flex-none place-items-center border font-mono text-xs"
                style={{
                  borderColor: isDone || on ? "var(--ap-accent)" : "var(--ap-divider-strong)",
                  background: isDone ? "var(--ap-accent)" : "transparent",
                  color: isDone ? "var(--ap-bg)" : on ? "var(--ap-accent)" : "var(--ap-muted)",
                }}
              >
                {isDone ? "✓" : n}
              </span>
              <span className="flex flex-col">
                <span
                  className="text-[13.5px] font-medium"
                  style={{ color: on || isDone ? "var(--ap-text)" : "var(--ap-muted)" }}
                >
                  {l}
                </span>
                <span className="font-mono text-[10.5px] text-muted">{d}</span>
              </span>
            </button>
          );
        })}
      </Blueprint>

      {/* ── Step 1: pick file ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">METRIC GROUP</span>
              <div className="grid grid-cols-3 border border-divider sm:grid-cols-6">
                {METRIC_GROUPS.map((g) => {
                  const on = group === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGroup(g.id)}
                      aria-pressed={on}
                      className="flex flex-col items-center gap-1.5 border-b border-r border-divider px-1 py-3 text-center text-xs transition-colors sm:border-b-0 sm:last:border-r-0"
                      style={{
                        background: on ? "var(--ap-accent-100)" : "transparent",
                        color: on ? "var(--ap-text)" : "var(--ap-muted)",
                      }}
                    >
                      <Icon name={g.icon} size={16} />
                      {g.n}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setFile(true)}
              className="dot-grid flex h-[300px] flex-col items-center justify-center gap-3.5 border border-dashed text-center transition-all duration-200 hover:border-accent"
              style={{
                borderColor: file ? "var(--ap-accent)" : "var(--ap-divider-strong)",
                background: file ? "var(--ap-accent-100)" : "transparent",
                backgroundSize: "16px 16px",
              }}
            >
              {file ? (
                <>
                  <span className="grid size-13 place-items-center border border-accent text-accent">
                    <Icon name="file" size={22} />
                  </span>
                  <span className="font-mono text-[15px]">ichkeul_soil_2026-09.csv</span>
                  <span className="font-mono text-[11.5px] text-muted">
                    1.8 MB &middot; 8 columns &middot; 4,318 rows detected &middot; delimiter &ldquo;;&rdquo;
                  </span>
                </>
              ) : (
                <>
                  <span className="grid size-13 place-items-center border border-divider-strong text-accent">
                    <Icon name="upload" size={22} />
                  </span>
                  <span className="font-heading text-[22px] font-semibold">Drop CSV or XLSX here</span>
                  <span className="text-[13px] text-muted">
                    or click to browse &middot; max 50 MB &middot; UTF-8, comma or semicolon separated
                  </span>
                </>
              )}
            </button>

            <div className="flex justify-end">
              <Button variant="primary" disabled={!file} onClick={() => setStep(2)}>
                Continue to mapping
                <Icon name="arrow" size={14} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">TEMPLATES</span>
            {METRIC_GROUPS.map((g) => (
              <Blueprint
                key={g.id}
                className="flex items-center gap-3.5 px-3.5 py-3 transition-colors duration-200"
                style={{
                  borderColor:
                    group === g.id ? "color-mix(in srgb, var(--ap-accent) 50%, transparent)" : undefined,
                }}
              >
                <span className="grid size-8.5 flex-none place-items-center border border-divider text-teal">
                  <Icon name={g.icon} size={16} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13.5px] font-medium">{g.n}</span>
                  <span className="truncate font-mono text-[10.5px] text-muted">{g.cols}</span>
                </span>
                <button className="px-1 font-mono text-[11px] text-accent hover:underline">CSV</button>
                <button className="px-1 font-mono text-[11px] text-accent hover:underline">XLSX</button>
              </Blueprint>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: map columns ───────────────────────────────────────── */}
      {step === 2 && (
        <Blueprint className="overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider px-4.5 py-3.5">
            <span className="font-heading text-lg font-semibold">Map file columns to APWRS fields</span>
            <span className="font-mono text-[11px] text-muted">7 of 8 auto-matched &middot; 1 needs review</span>
          </div>
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
                {["File column", "Sample", "", "APWRS field", "Unit", "Match"].map((h, i) => (
                  <th
                    key={h || i}
                    className={`border-b border-divider py-2.5 text-left font-normal uppercase ${i === 0 ? "px-4.5" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COLUMN_MAP.map(([c, s, f, u, m]) => (
                <tr key={c} className="transition-colors hover:bg-neutral-100">
                  <td className="border-b border-divider px-4.5 py-2.5 font-mono text-xs">{c}</td>
                  <td className="border-b border-divider font-mono text-[11.5px] text-muted">{s}</td>
                  <td className="border-b border-divider text-faint">
                    <Icon name="arrow" size={14} />
                  </td>
                  <td className="border-b border-divider">
                    <div
                      className="flex h-[30px] w-[230px] items-center justify-between px-2.5 text-[12.5px]"
                      style={{ border: `1px solid ${m === "AUTO" ? "var(--ap-divider)" : "#E7A83B"}` }}
                    >
                      {f}
                      <Icon name="down" size={13} />
                    </div>
                  </td>
                  <td className="border-b border-divider font-mono text-[11.5px]">{u}</td>
                  <td className="border-b border-divider">
                    <span
                      className="font-mono text-[10.5px]"
                      style={{ color: m === "AUTO" ? "var(--ap-accent)" : "#E7A83B" }}
                    >
                      {m}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between gap-3 px-4.5 py-3.5">
            <Button onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" onClick={() => setStep(3)}>
              Validate 4,318 rows
            </Button>
          </div>
        </Blueprint>
      )}

      {/* ── Step 3: validate ──────────────────────────────────────────── */}
      {step === 3 && (
        <>
          <Blueprint className="grid grid-cols-2 xl:grid-cols-4">
            {(
              [
                ["VALID", "4,281", "var(--ap-accent)"],
                ["WARNINGS", "29", "#E7A83B"],
                ["ERRORS", "8", "#E07B7B"],
                ["DUPLICATES", "0", "var(--ap-text)"],
              ] as const
            ).map(([k, v, c], i) => (
              <div key={k} className={`border-b border-divider px-4.5 py-3.5 xl:border-b-0 ${i < 3 ? "xl:border-r" : ""}`}>
                <div className="font-mono text-[10px] tracking-[0.1em] text-muted">{k}</div>
                <div className="font-heading text-[30px] font-semibold" style={{ color: c }}>
                  {v}
                </div>
              </div>
            ))}
          </Blueprint>

          <Blueprint className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
              <thead>
                <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
                  {["Row", "Timestamp", "Station", "VWC %", "Temp °C", "EC dS/m", "Issue"].map((h, i) => (
                    <th
                      key={h}
                      className={`border-b border-divider py-2.5 font-normal uppercase ${i === 0 ? "px-4.5 text-left" : i >= 3 && i <= 5 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VALIDATION_ROWS.map(([n, t, s, v, tp, ec, issue, sev]) => {
                  const ink = sev === 2 ? "#E07B7B" : sev === 1 ? "#E7A83B" : "var(--ap-accent)";
                  return (
                    <tr
                      key={n}
                      style={{
                        background:
                          sev === 2 ? "rgb(217 101 101 / 0.06)" : sev === 1 ? "rgb(231 168 59 / 0.05)" : "transparent",
                      }}
                    >
                      <td className="border-b border-divider px-4.5 py-2.25 font-mono text-muted">{n}</td>
                      <td className="border-b border-divider font-mono">{t}</td>
                      <td className="border-b border-divider font-mono">{s}</td>
                      <td
                        className="border-b border-divider text-right font-mono"
                        style={{ color: sev === 2 ? "#E07B7B" : "var(--ap-text)" }}
                      >
                        {v}
                      </td>
                      <td className="border-b border-divider text-right font-mono">{tp}</td>
                      <td className="border-b border-divider text-right font-mono">{ec}</td>
                      <td className="border-b border-divider">
                        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: ink }}>
                          <span className="size-1.5" style={{ background: ink }} />
                          {issue || "OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4.5 py-3.5">
              <Button onClick={() => setStep(2)}>Back</Button>
              <div className="flex items-center gap-2.5">
                <span className="text-[12.5px] text-muted">8 rows with errors will be skipped</span>
                <Button variant="primary" onClick={startImport}>
                  Import 4,310 rows
                </Button>
              </div>
            </div>
          </Blueprint>
        </>
      )}

      {/* ── Step 4: import ────────────────────────────────────────────── */}
      {step === 4 && (
        <Blueprint className="flex max-w-[720px] flex-col gap-4.5 p-9">
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl font-semibold">
              {pct >= 100 ? "Import complete" : "Importing…"}
            </span>
            <span className="font-heading text-[40px] font-semibold tabular-nums">{pct}%</span>
          </div>
          <div className="relative h-2 bg-neutral-100">
            <motion.div
              className="absolute inset-y-0 left-0 bg-accent"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5 font-mono text-[11.5px] text-muted">
            <span>{done} / 4,310 rows</span>
            <span>ichkeul_soil_2026-09.csv</span>
            <span className="text-right">{pct >= 100 ? "done" : `~${Math.ceil((100 - pct) / 30)} s left`}</span>
          </div>
          {pct >= 100 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-2.5 border-t border-divider pt-3"
            >
              <span className="text-accent">
                <Icon name="check" size={18} />
              </span>
              <span className="flex-1 text-[13.5px]">
                Dataset <span className="font-mono">DS-2026-0419</span> created. Model will re-run with new soil data
                at 18:00 UTC.
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setStep(1);
                  setFile(false);
                  setProgress(0);
                }}
              >
                Upload another
              </Button>
            </motion.div>
          )}
        </Blueprint>
      )}
    </div>
  );
}
