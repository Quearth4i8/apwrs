"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { Panel, Button, PageHeader, Segmented, TabStrip } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { SOIL_MODEL, STATIONS, type Station } from "@/lib/climate";

type Section = "users" | "regions" | "settings";

const TITLES: Record<Section, [string, string]> = {
  users: ["Users & roles", "ADMIN · USERS & ROLES"],
  regions: ["Regions & sites", "ADMIN · REGIONS & SITES"],
  settings: ["Settings", "ADMIN · SETTINGS"],
};

export function PageAdmin({ section: initial }: { section: Section }) {
  const [section, setSection] = React.useState(initial);
  const [title, kicker] = TITLES[section];

  return (
    <div className="flex flex-col gap-5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={kicker}
        title={title}
        actions={section === "settings" ? <Button variant="primary">Save changes</Button> : undefined}
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

      {section === "users" && (
        <NoData
          icon="users"
          title="No user directory connected"
          what="Accounts, roles and per-site access need an identity provider or a user table behind them. There is no authentication in this build, so there are no users to list."
          needs="auth provider + user store"
        />
      )}
      {section === "regions" && <Regions />}
      {section === "settings" && <Settings />}
    </div>
  );
}

/* ── Regions & sites ───────────────────────────────────────────────────── */

function Regions() {
  const [stationId, setStationId] = React.useState(STATIONS[0].id);
  const selected: Station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0];

  return (
    <>
      <Panel className="grid min-h-[520px] grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-divider p-2.5 xl:border-b-0 xl:border-r">
          <div className="flex h-8 items-center gap-2 px-2 text-[13px] font-semibold">
            <span className="font-mono text-[10.5px] text-muted">TN</span>
            Tunisia
            <span className="ml-auto font-mono text-[10.5px] text-muted">{STATIONS.length}</span>
          </div>
          <div className="flex h-7 items-center gap-2 pl-7 pr-2 text-[12.5px] text-muted">Bizerte Governorate</div>
          {STATIONS.map((s) => {
            const on = stationId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStationId(s.id)}
                className="flex h-[30px] w-full items-center gap-2 py-0 pl-11 pr-2 text-left text-[13px] transition-colors hover:bg-neutral-100"
                style={{
                  background: on ? "var(--ap-neutral-100)" : "transparent",
                  boxShadow: `inset 2px 0 0 ${on ? "var(--ap-accent)" : "transparent"}`,
                }}
              >
                <Icon name="pin" size={13} />
                {s.name}
                <span className="ml-auto font-mono text-[10px] text-faint">{s.id}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-divider px-5 py-4.5">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
                TUNISIA / {selected.region.toUpperCase()} GOVERNORATE
              </span>
              <span className="font-heading text-[28px] font-semibold">{selected.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-divider xl:grid-cols-4">
            {(
              [
                ["COORDINATES", `${selected.lat.toFixed(3)}°N ${selected.lon.toFixed(3)}°E`],
                ["ALTITUDE", `${selected.alt} m`],
                ["RECORD", `${selected.coverage.from.slice(0, 4)}–${selected.coverage.to.slice(0, 4)}`],
                ["OBSERVATIONS", selected.coverage.days.toLocaleString("en-GB")],
              ] as const
            ).map(([k, v], i) => (
              <div key={k} className={`border-b border-divider px-5 py-3 xl:border-b-0 ${i < 3 ? "xl:border-r" : ""}`}>
                <div className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</div>
                <div className="font-mono text-sm">{v}</div>
              </div>
            ))}
          </div>

          <div className="relative min-h-[300px] flex-1">
            <MapView layer="none" sensors className="absolute inset-0" />
          </div>
        </div>
      </Panel>

      <Provenance>
        The only sites that exist are the two stations the record was measured at &mdash; coordinates from the
        source workbook
      </Provenance>
    </>
  );
}

/* ── Settings ──────────────────────────────────────────────────────────── */

function Settings() {
  const [units, setUnits] = React.useState({ temp: "°C", rain: "mm", area: "km²" });
  const [loc, setLoc] = React.useState({ lang: "EN", date: "DD/MM/YYYY", week: "MON" });

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <div className="flex flex-col gap-6">
        <SettingsCard title="Units">
          {(
            [
              ["Temperature", "temp", ["°C", "°F"]],
              ["Precipitation", "rain", ["mm", "in"]],
              ["Area", "area", ["km²", "ha"]],
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
              ["Interface language", "lang", ["EN", "FR"]],
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

      {/* Real model constants, not preferences. */}
      <Panel className="flex flex-col">
        <div className="border-b border-divider px-5 py-3.5 font-heading text-lg font-semibold">Model constants</div>
        <SettingsRow label="Field capacity">
          <span className="font-mono text-[13px]">{SOIL_MODEL.fieldCapacityMm} mm</span>
        </SettingsRow>
        <SettingsRow label="Wilting point">
          <span className="font-mono text-[13px]">{SOIL_MODEL.wiltingPointMm} mm</span>
        </SettingsRow>
        <SettingsRow label="Total available water">
          <span className="font-mono text-[13px]">{SOIL_MODEL.tawMm} mm</span>
        </SettingsRow>
        <SettingsRow label="Establishment threshold">
          <span className="font-mono text-[13px]">20 mm / 21 d</span>
        </SettingsRow>
        <SettingsRow label="Reference ET method">
          <span className="font-mono text-[13px]">FAO-56 Penman&ndash;Monteith</span>
        </SettingsRow>
        <SettingsRow label="SPEI distribution">
          <span className="font-mono text-[13px]">log-logistic, PWM</span>
        </SettingsRow>
        <div className="px-5 py-3.5 text-[12.5px] leading-[1.5] text-muted">
          Alert thresholds used to live here. They are not shown because nothing evaluates them &mdash; see Alerts.
        </div>
      </Panel>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="flex flex-col">
      <div className="border-b border-divider px-5 py-3.5 font-heading text-lg font-semibold">{title}</div>
      {children}
    </Panel>
  );
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0">
      <span className="text-[13.5px]">{label}</span>
      {children}
    </div>
  );
}
