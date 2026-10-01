"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { MapView } from "@/components/map-view";
import { Panel, Button, PageHeader, Segmented, TabStrip } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { SOIL_MODEL, STATIONS, type Station } from "@/lib/climate";

type Section = "users" | "regions" | "settings";

const TITLES: Record<Section, [string, string]> = {
  users: ["Users & roles", "Who can use the app, and what they can change."],
  regions: ["Regions & sites", "The places the app has weather data for."],
  settings: ["Settings", "Units, language and the model's fixed values."],
};

export function PageAdmin({ section: initial }: { section: Section }) {
  const [section, setSection] = React.useState(initial);
  const [title, lede] = TITLES[section];

  return (
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        title={title}
        lede={lede}
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
          what="Accounts, roles and per-site access need a sign-in system and a list of users behind them. Neither is connected yet, so there are no users to show."
          needs="a sign-in system"
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
        <div className="flex flex-col gap-0.5 border-b border-divider p-3 xl:border-b-0 xl:border-r">
          <div className="flex h-9 items-center gap-2 px-2 text-[14px] font-semibold">
            Tunisia
            <span className="ml-auto text-[12px] font-normal text-muted">{STATIONS.length} sites</span>
          </div>
          <div className="flex h-7 items-center gap-2 px-2 text-[12.5px] text-muted">Bizerte governorate</div>
          {STATIONS.map((s) => {
            const on = stationId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStationId(s.id)}
                className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[13.5px] transition-colors hover:bg-neutral-100"
                style={{ background: on ? "var(--ap-accent-100)" : undefined, fontWeight: on ? 600 : 400 }}
              >
                <span className={on ? "text-accent" : "text-muted"}>
                  <Icon name="pin" size={15} />
                </span>
                {s.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-col gap-0.5 px-5 pb-3 pt-5">
            <span className="text-[24px] font-semibold leading-tight">{selected.name}</span>
            <span className="text-[13px] text-muted">{selected.region} governorate, Tunisia</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 px-5 pb-5 xl:grid-cols-4">
            {(
              [
                ["Location", `${selected.lat.toFixed(3)}°N ${selected.lon.toFixed(3)}°E`],
                ["Altitude", `${selected.alt} m`],
                ["Weather record", `${selected.coverage.from.slice(0, 4)}–${selected.coverage.to.slice(0, 4)}`],
                ["Days of data", selected.coverage.days.toLocaleString("en-GB")],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5 rounded-[12px] bg-neutral-100 px-3.5 py-2.5">
                <span className="text-[12.5px] text-muted">{k}</span>
                <span className="text-[15px] font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>

          <div className="relative min-h-[300px] flex-1">
            <MapView layer="none" sensors className="absolute inset-0" />
          </div>
        </div>
      </Panel>

      <Provenance>Sites are the two weather stations; coordinates from the station workbooks</Provenance>
    </>
  );
}

/* ── Settings ──────────────────────────────────────────────────────────── */

function Settings() {
  const [units, setUnits] = React.useState({ temp: "°C", rain: "mm", area: "km²" });
  const [loc, setLoc] = React.useState({ lang: "EN", date: "DD/MM/YYYY", week: "Mon" });

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
                options={opts.map((o) => ({ value: o, label: o }))}
              />
            </SettingsRow>
          ))}
        </SettingsCard>

        <SettingsCard title="Language & region">
          {(
            [
              ["Interface language", "lang", ["EN", "FR"]],
              ["Date format", "date", ["DD/MM/YYYY", "YYYY-MM-DD"]],
              ["Week starts", "week", ["Mon", "Sun"]],
            ] as const
          ).map(([label, k, opts]) => (
            <SettingsRow key={k} label={label}>
              <Segmented
                size="sm"
                value={loc[k]}
                onChange={(v) => setLoc((l) => ({ ...l, [k]: v }))}
                options={opts.map((o) => ({ value: o, label: o }))}
              />
            </SettingsRow>
          ))}
        </SettingsCard>
      </div>

      {/* Real model constants, not preferences. */}
      <Panel className="flex flex-col">
        <div className="flex flex-col gap-0.5 border-b border-divider px-5 py-4">
          <span className="text-[16px] font-semibold">Model values</span>
          <span className="text-[13px] text-muted">Fixed numbers the calculations use</span>
        </div>
        <SettingsRow label="Field capacity">
          <span className="text-[13.5px] font-semibold tabular-nums">{SOIL_MODEL.fieldCapacityMm} mm</span>
        </SettingsRow>
        <SettingsRow label="Wilting point">
          <span className="text-[13.5px] font-semibold tabular-nums">{SOIL_MODEL.wiltingPointMm} mm</span>
        </SettingsRow>
        <SettingsRow label="Total available water">
          <span className="text-[13.5px] font-semibold tabular-nums">{SOIL_MODEL.tawMm} mm</span>
        </SettingsRow>
        <SettingsRow label="Rain needed after sowing">
          <span className="text-[13.5px] font-semibold tabular-nums">20 mm in 3 weeks</span>
        </SettingsRow>
        <SettingsRow label="Evaporation formula">
          <span className="text-[13.5px] font-semibold tabular-nums">FAO-56 Penman&ndash;Monteith</span>
        </SettingsRow>
        <SettingsRow label="Drought index fit">
          <span className="text-[13.5px] font-semibold tabular-nums">log-logistic, PWM</span>
        </SettingsRow>
        <div className="px-5 py-3.5 text-[12.5px] leading-[1.5] text-muted">
          Alert limits will appear here once alerts are connected.
        </div>
      </Panel>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="flex flex-col">
      <div className="border-b border-divider px-5 py-4 text-[16px] font-semibold">{title}</div>
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
