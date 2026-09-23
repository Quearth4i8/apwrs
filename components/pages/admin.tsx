"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { Blueprint, Button, PageHeader, Segmented, TabStrip } from "@/components/ui/primitives";
import { REGION_TREE, ROLES, USERS, type SiteNode } from "@/lib/data";

type Section = "users" | "regions" | "settings";

const TITLES: Record<Section, [string, string]> = {
  users: ["Users & roles", "USERS & ROLES · 38 USERS"],
  regions: ["Regions & sites", "REGIONS & SITES · 3 COUNTRIES · 7 SITES"],
  settings: ["Settings", "SETTINGS"],
};

export function PageAdmin({ section: initial }: { section: Section }) {
  const [section, setSection] = React.useState(initial);
  const [title, kicker] = TITLES[section];

  return (
    <div className="flex flex-col gap-5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={kicker}
        title={title}
        actions={
          <Button variant="primary">
            {section !== "settings" && <Icon name="plus" size={15} />}
            {section === "users" ? "Invite user" : section === "regions" ? "Add site" : "Save changes"}
          </Button>
        }
      />

      <TabStrip
        value={section}
        onChange={setSection}
        tabs={[
          { value: "users", label: "Users & roles" },
          { value: "regions", label: "Regions & sites" },
          { value: "settings", label: "Settings" },
        ]}
      />

      {section === "users" && <Users />}
      {section === "regions" && <Regions />}
      {section === "settings" && <Settings />}
    </div>
  );
}

/* ── Users & roles ─────────────────────────────────────────────────────── */

function Users() {
  return (
    <>
      <Blueprint className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {ROLES.map(([n, c, d], i) => (
          <div
            key={n}
            className={`flex flex-col gap-1 border-b border-r border-divider px-4 py-3 xl:border-b-0 ${
              i === ROLES.length - 1 ? "xl:border-r-0" : ""
            }`}
          >
            <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{n}</span>
            <span className="font-heading text-2xl font-semibold">{c}</span>
            <span className="text-[11.5px] leading-[1.35] text-muted">{d}</span>
          </div>
        ))}
      </Blueprint>

      <Blueprint className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-[13px]">
          <thead>
            <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
              {["User", "Organisation", "Role", "Site access", "Last active", "Status", ""].map((h, i) => (
                <th
                  key={h || i}
                  className={`border-b border-divider py-2.75 text-left font-normal uppercase ${i === 0 ? "px-4" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {USERS.map(([ini, n, e, o, r, s, l, st]) => (
              <tr key={e} className="transition-colors hover:bg-neutral-100">
                <td className="border-b border-divider px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-7 flex-none place-items-center border border-divider bg-s3 font-mono text-[10.5px]">
                      {ini}
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium">{n}</span>
                      <span className="font-mono text-[10.5px] text-muted">{e}</span>
                    </span>
                  </div>
                </td>
                <td className="border-b border-divider text-muted">{o}</td>
                <td className="border-b border-divider">
                  <span className="inline-flex h-7 min-w-[140px] items-center justify-between gap-2.5 border border-divider px-2.5 text-[12.5px]">
                    {r}
                    <Icon name="down" size={12} />
                  </span>
                </td>
                <td className="border-b border-divider font-mono text-[11px] text-muted">{s}</td>
                <td className="border-b border-divider font-mono text-[11px] text-muted">{l}</td>
                <td className="border-b border-divider">
                  <span
                    className="inline-flex items-center gap-1.5 font-mono text-[10.5px]"
                    style={{
                      color:
                        st === "ACTIVE" ? "var(--ap-accent)" : st === "INVITED" ? "#E7A83B" : "var(--ap-muted)",
                    }}
                  >
                    <span
                      className="size-1.5"
                      style={{
                        background:
                          st === "ACTIVE" ? "var(--ap-accent)" : st === "INVITED" ? "#E7A83B" : "var(--ap-muted)",
                      }}
                    />
                    {st}
                  </span>
                </td>
                <td className="border-b border-divider pr-3.5 text-right text-muted">
                  <Icon name="more" size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Blueprint>
    </>
  );
}

/* ── Regions & sites ───────────────────────────────────────────────────── */

function Regions() {
  const [siteName, setSiteName] = React.useState("Ichkeul");

  let selected: { site: SiteNode; path: string } | null = null;
  for (const c of REGION_TREE) {
    for (const r of c.regions) {
      for (const s of r.sites) {
        if (s.n === siteName) selected = { site: s, path: `${c.n.toUpperCase()} / ${r.n.toUpperCase()}` };
      }
    }
  }
  if (!selected) return null;

  return (
    <Blueprint className="grid min-h-[560px] grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="border-b border-divider p-2.5 xl:border-b-0 xl:border-r">
        {REGION_TREE.map((c) => (
          <div key={c.cc}>
            <div className="flex h-8 items-center gap-2 px-2 text-[13px] font-semibold">
              <Icon name="down" size={13} />
              <span className="font-mono text-[10.5px] text-muted">{c.cc}</span>
              {c.n}
              <span className="ml-auto font-mono text-[10.5px] text-muted">
                {c.regions.reduce((s, r) => s + r.sites.length, 0)}
              </span>
            </div>
            {c.regions.map((r) => (
              <div key={r.n}>
                <div className="flex h-7 items-center gap-2 pl-7 pr-2 text-[12.5px] text-muted">{r.n}</div>
                {r.sites.map((s) => {
                  const on = siteName === s.n;
                  return (
                    <button
                      key={s.n}
                      onClick={() => setSiteName(s.n)}
                      className="flex h-[30px] w-full items-center gap-2 py-0 pl-11 pr-2 text-left text-[13px] transition-colors hover:bg-neutral-100"
                      style={{
                        background: on ? "var(--ap-neutral-100)" : "transparent",
                        boxShadow: `inset 2px 0 0 ${on ? "var(--ap-accent)" : "transparent"}`,
                      }}
                    >
                      <Icon name="pin" size={13} />
                      {s.n}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-divider px-5 py-4.5">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">{selected.path}</span>
            <span className="font-heading text-[28px] font-semibold">{selected.site.n}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8">
              <Icon name="pencil" size={14} />
              Edit
            </Button>
            <Button size="sm" className="h-8">
              <Icon name="polygon" size={14} />
              Edit boundary
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-divider xl:grid-cols-4">
          {(
            [
              ["CENTROID", selected.site.centroid],
              ["AREA", selected.site.area],
              ["SENSORS", String(selected.site.sensors)],
              ["CROPS", selected.site.crops],
            ] as const
          ).map(([k, v], i) => (
            <div key={k} className={`border-b border-divider px-5 py-3 xl:border-b-0 ${i < 3 ? "xl:border-r" : ""}`}>
              <div className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</div>
              <div className="font-mono text-sm">{v}</div>
            </div>
          ))}
        </div>
        <div className="relative min-h-[320px] flex-1">
          <MapView layer="none" sensors className="absolute inset-0" />
        </div>
      </div>
    </Blueprint>
  );
}

/* ── Settings ──────────────────────────────────────────────────────────── */

function Settings() {
  const [units, setUnits] = React.useState({ temp: "°C", rain: "mm", area: "km²", sm: "% VWC" });
  const [loc, setLoc] = React.useState({ lang: "EN", date: "DD/MM/YYYY", week: "MON" });
  const [t, setT] = React.useState<[number, number, number]>([25, 50, 75]);

  const setThreshold = (i: number, v: number) =>
    setT((prev) => prev.map((x, j) => (j === i ? v : x)) as [number, number, number]);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <div className="flex flex-col gap-6">
        <SettingsCard title="Units">
          {(
            [
              ["Temperature", "temp", ["°C", "°F"]],
              ["Precipitation", "rain", ["mm", "in"]],
              ["Area", "area", ["km²", "ha"]],
              ["Soil moisture", "sm", ["% VWC", "m³/m³"]],
            ] as const
          ).map(([label, k, opts]) => (
            <SettingsRow key={k} label={label}>
              <Segmented
                size="sm"
                value={units[k]}
                onChange={(v) => setUnits((u) => ({ ...u, [k]: v }))}
                options={opts.map((o) => ({ value: o, label: <span className="font-mono text-[11.5px]">{o}</span> }))}
              />
            </SettingsRow>
          ))}
        </SettingsCard>

        <SettingsCard title="Language & region">
          {(
            [
              ["Default language", "lang", ["EN", "FR", "AR"]],
              ["Date format", "date", ["DD/MM/YYYY", "YYYY-MM-DD"]],
              ["Week starts", "week", ["MON", "SUN"]],
            ] as const
          ).map(([label, k, opts]) => (
            <SettingsRow key={k} label={label}>
              <Segmented
                size="sm"
                value={loc[k]}
                onChange={(v) => setLoc((l) => ({ ...l, [k]: v }))}
                options={opts.map((o) => ({ value: o, label: <span className="font-mono text-[11.5px]">{o}</span> }))}
              />
            </SettingsRow>
          ))}
        </SettingsCard>
      </div>

      <Blueprint className="flex flex-col">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-divider px-5 py-3.5">
          <span className="font-heading text-lg font-semibold">Alert thresholds</span>
          <span className="font-mono text-[10.5px] text-muted">APPLIES TO ALL SITES</span>
        </div>
        <div className="flex flex-col gap-4.5 p-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex h-3.5">
              <div style={{ width: `${t[0]}%`, background: "#38A88A" }} />
              <div style={{ width: `${t[1] - t[0]}%`, background: "#E7A83B" }} />
              <div style={{ width: `${t[2] - t[1]}%`, background: "#EE8434" }} />
              <div className="flex-1" style={{ background: "#D96565" }} />
            </div>
            <div className="relative h-3.5 font-mono text-[10px] text-muted">
              <span className="absolute left-0">0</span>
              {t.map((v, i) => (
                <span key={i} className="absolute -translate-x-1/2" style={{ left: `${v}%` }}>
                  {v}
                </span>
              ))}
              <span className="absolute right-0">100</span>
            </div>
          </div>

          {(
            [
              ["Watch", "#E7A83B", 10, t[1] - 5, 0],
              ["Severe", "#EE8434", t[0] + 5, t[2] - 5, 1],
              ["Extreme", "#D96565", t[1] + 5, 95, 2],
            ] as const
          ).map(([label, c, min, max, i]) => (
            <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)_44px] items-center gap-3.5">
              <span className="flex items-center gap-2 text-[13.5px]">
                <span className="size-2" style={{ background: c }} />
                {label} from
              </span>
              <input
                type="range"
                min={min}
                max={max}
                value={t[i]}
                onChange={(e) => setThreshold(i, +e.target.value)}
                aria-label={`${label} threshold`}
                style={{ accentColor: c }}
              />
              <span className="text-right font-mono text-sm">{t[i]}</span>
            </div>
          ))}

          <div className="flex flex-col gap-2.5 border-t border-divider pt-3.5">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">NOTIFY WHEN RISK ENTERS</span>
            <div className="grid gap-2 text-[13px] sm:grid-cols-3">
              {(
                [
                  ["Severe · email", true],
                  ["Extreme · SMS", true],
                  ["Watch · in-app", false],
                ] as const
              ).map(([l, on]) => (
                <span key={l} className="flex items-center gap-2 border border-divider px-2.5 py-2">
                  <span
                    className="size-3"
                    style={{
                      background: on ? "var(--ap-accent)" : "transparent",
                      border: on ? undefined : "1px solid var(--ap-divider-strong)",
                    }}
                  />
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Blueprint>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Blueprint className="flex flex-col">
      <div className="border-b border-divider px-5 py-3.5 font-heading text-lg font-semibold">{title}</div>
      {children}
    </Blueprint>
  );
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3">
      <span className="text-[13.5px]">{label}</span>
      {children}
    </div>
  );
}
