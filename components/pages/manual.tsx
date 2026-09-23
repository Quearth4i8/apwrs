"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Blueprint, Button, Field, Input, PageHeader, UnitInput } from "@/components/ui/primitives";
import { MANUAL_GROUPS } from "@/lib/data";

const key = (g: number, f: number) => `${g}-${f}`;

export function PageManual() {
  const { site } = useConsole();
  const [g, setG] = React.useState(0);
  const [vals, setVals] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(MANUAL_GROUPS.flatMap((gr, gi) => gr.f.map((f, fi) => [key(gi, fi), f[3]]))),
  );
  const [tried, setTried] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const filled = (gi: number) => MANUAL_GROUPS[gi].f.filter((_, fi) => vals[key(gi, fi)]).length;
  const reqMissing = (gi: number) => MANUAL_GROUPS[gi].f.filter((f, fi) => f[2] && !vals[key(gi, fi)]).length;
  const touched = (gi: number) => filled(gi) > 0;

  const summary = MANUAL_GROUPS.map((gr, gi) => ({
    gi,
    n: gr.n,
    items: gr.f
      .map((f, fi) => ({
        l: f[0],
        v: vals[key(gi, fi)] ? `${vals[key(gi, fi)]} ${f[1] === "—" ? "" : f[1]}` : "",
      }))
      .filter((i) => i.v),
  }))
    .filter((s) => s.items.length)
    .map((s) => {
      const m = reqMissing(s.gi);
      return { ...s, st: m ? `${m} REQUIRED MISSING` : "COMPLETE", c: m ? "#E7A83B" : "var(--ap-accent)" };
    });

  const missing = MANUAL_GROUPS.reduce((a, _, gi) => a + (touched(gi) ? reqMissing(gi) : 0), 0);
  const total = Object.values(vals).filter(Boolean).length;
  const group = MANUAL_GROUPS[g];

  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={<>DATA &middot; MANUAL ENTRY</>}
        title="Manual entry"
        lede={
          <>
            Record a field observation. Fields marked <span className="text-extreme-ink">*</span> are required;
            everything else is optional.
          </>
        }
        actions={<span className="font-mono text-[11px] text-muted">Draft autosaved 08:41</span>}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          {/* Shared metadata */}
          <Blueprint className="flex flex-col gap-3.5 px-5 py-4.5">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
              SHARED METADATA &middot; APPLIES TO ALL GROUPS
            </span>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <Field label="Site" required>
                <div className="flex h-9 items-center justify-between border border-divider bg-bg px-2.5 text-[13px]">
                  {site.name}, {site.cc}
                  <Icon name="down" size={13} />
                </div>
              </Field>
              <Field label="Date" required>
                <Input defaultValue="2026-09-23" className="font-mono text-[13px]" />
              </Field>
              <Field label="Time" required>
                <Input defaultValue="08:30" className="font-mono text-[13px]" />
              </Field>
              <Field label="Latitude" required>
                <UnitInput unit="&deg;N" defaultValue="37.1121" />
              </Field>
              <Field label="Longitude" required>
                <UnitInput unit="&deg;E" defaultValue="9.7358" />
              </Field>
              <Field label="Altitude">
                <UnitInput unit="m" defaultValue="22" />
              </Field>
            </div>
          </Blueprint>

          {/* Metric groups */}
          <Blueprint className="flex flex-col">
            <div className="grid grid-cols-2 border-b border-divider sm:grid-cols-3 xl:grid-cols-6">
              {MANUAL_GROUPS.map((t, i) => {
                const on = g === i;
                const f = filled(i);
                const m = touched(i) && reqMissing(i);
                return (
                  <button
                    key={t.id}
                    onClick={() => setG(i)}
                    aria-pressed={on}
                    className="flex items-center gap-2 border-b border-r border-divider px-3.5 py-3 text-[13px] transition-colors xl:border-b-0 xl:last:border-r-0"
                    style={{
                      background: on ? "var(--ap-neutral-100)" : "transparent",
                      boxShadow: `inset 0 -2px 0 ${on ? "var(--ap-accent)" : "transparent"}`,
                      color: on ? "var(--ap-text)" : "var(--ap-muted)",
                    }}
                  >
                    <Icon name={t.icon} size={15} />
                    <span className="flex-1 truncate text-left">{t.n}</span>
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: m ? "#E7A83B" : f ? "var(--ap-accent)" : "var(--ap-faint)" }}
                    >
                      {f ? `${f}/${t.f.length}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {group.f.map((f, fi) => {
                const k = key(g, fi);
                const v = vals[k];
                const err = tried && !!f[2] && !v && touched(g);
                return (
                  <Field
                    key={f[0]}
                    label={f[0]}
                    required={!!f[2]}
                    hint={f[2] ? "" : "OPTIONAL"}
                    error={err ? "Required" : undefined}
                  >
                    <UnitInput
                      unit={f[1]}
                      value={v}
                      placeholder={f[2] ? "required" : "—"}
                      onChange={(e) => {
                        setVals((s) => ({ ...s, [k]: e.target.value }));
                        setSaved(false);
                      }}
                      style={err ? { borderColor: "#D96565" } : undefined}
                    />
                  </Field>
                );
              })}
            </div>

            <div className="flex justify-between gap-3 border-t border-divider px-5 py-3.5">
              <Button size="sm" className="h-[34px]" onClick={() => setG(Math.max(0, g - 1))} disabled={g === 0}>
                <Icon name="left" size={14} />
                {g ? MANUAL_GROUPS[g - 1].n : "—"}
              </Button>
              <Button
                size="sm"
                className="h-[34px]"
                onClick={() => setG(Math.min(MANUAL_GROUPS.length - 1, g + 1))}
                disabled={g === MANUAL_GROUPS.length - 1}
              >
                {g < MANUAL_GROUPS.length - 1 ? MANUAL_GROUPS[g + 1].n : "—"}
                <Icon name="right" size={14} />
              </Button>
            </div>
          </Blueprint>
        </div>

        {/* Summary */}
        <Blueprint className="flex flex-col xl:sticky xl:top-5">
          <div className="flex items-baseline justify-between border-b border-divider px-4.5 py-3.5">
            <span className="font-heading text-lg font-semibold">Summary</span>
            <span className="font-mono text-[10.5px] text-muted">{total} values</span>
          </div>
          <div className="border-b border-divider px-4.5 py-3 font-mono text-[11px] leading-[1.7] text-muted">
            {site.name} &middot; 2026-09-23 08:30
            <br />
            37.1121&deg;N 9.7358&deg;E &middot; 22 m
          </div>
          {summary.map((s) => (
            <div key={s.n} className="flex flex-col gap-1.5 border-b border-divider px-4.5 py-2.5">
              <div className="flex justify-between text-[13px]">
                <span className="font-medium">{s.n}</span>
                <span className="font-mono text-[10.5px]" style={{ color: s.c }}>
                  {s.st}
                </span>
              </div>
              {s.items.map((i) => (
                <div key={i.l} className="flex justify-between gap-3 font-mono text-[11px] text-muted">
                  <span className="truncate">{i.l}</span>
                  <span className="whitespace-nowrap text-ink">{i.v}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="flex flex-col gap-2 px-4.5 py-3.5">
            {missing > 0 && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "#E7A83B" }}>
                <Icon name="alert" size={13} />
                {missing} required field{missing > 1 ? "s" : ""} missing in started groups
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-accent">
                <Icon name="check" size={13} />
                Saved as record MR-2026-1187
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                setTried(true);
                setSaved(missing === 0);
              }}
            >
              Save {total} values
            </Button>
          </div>
        </Blueprint>
      </div>
    </div>
  );
}
