"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icon";
import { MapView, type MapCell } from "@/components/map-view";
import { useConsole } from "@/components/app-context";
import {
  Blueprint,
  Button,
  Field,
  Input,
  PageHeader,
  Segmented,
  UnitInput,
} from "@/components/ui/primitives";
import { SENSOR_ROWS, SENSOR_STATUS, SENSOR_TYPE, type SensorRow, type SensorType } from "@/lib/data";

type Filter = SensorType | "all";

export function PageSensors() {
  const { site } = useConsole();
  const [view, setView] = React.useState<"table" | "map">("table");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [editing, setEditing] = React.useState<SensorRow | null>(null);
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const rows = SENSOR_ROWS.filter(
    (r) =>
      (filter === "all" || r.type === filter) &&
      (!q || r.id.toLowerCase().includes(q.toLowerCase()) || r.name.toLowerCase().includes(q.toLowerCase())),
  );

  function openDrawer(row: SensorRow | null) {
    setEditing(row);
    setOpen(true);
  }

  return (
    <div className="flex min-h-full flex-col gap-5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={
          <>
            MONITOR &middot; SENSORS &middot; {site.cc} / {site.name}
          </>
        }
        title="Field stations"
        lede="24 stations · 19 online · readings every 15 min via LoRaWAN / GSM"
        actions={
          <>
            <Segmented
              value={view}
              onChange={setView}
              className="h-9"
              options={[
                { value: "table", label: <><Icon name="table" size={14} />Table</> },
                { value: "map", label: <><Icon name="map" size={14} />Map</> },
              ]}
            />
            <Button variant="primary" onClick={() => openDrawer(null)}>
              <Icon name="plus" size={15} />
              Register sensor
            </Button>
          </>
        }
      />

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "weather", "soil", "water", "custom"] as const).map((t) => {
          const on = filter === t;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              aria-pressed={on}
              className="flex h-[30px] items-center gap-1.5 border px-2.75 text-[12.5px] transition-colors hover:border-divider-strong"
              style={{
                borderColor: on ? "color-mix(in srgb, var(--ap-accent) 45%, transparent)" : "var(--ap-divider)",
                background: on ? "var(--ap-accent-100)" : "transparent",
                color: on ? "var(--ap-text)" : "var(--ap-muted)",
              }}
            >
              {t === "all" ? "All types" : SENSOR_TYPE[t].label}
              <span className="font-mono text-[10.5px] text-muted">
                {t === "all" ? 24 : SENSOR_TYPE[t].count}
              </span>
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="flex h-[30px] w-[240px] items-center gap-2 border border-divider px-2.5 text-[12.5px] focus-within:border-accent">
          <span className="text-muted">
            <Icon name="search" size={14} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by ID or name"
            aria-label="Filter stations"
            className="min-w-0 flex-1 border-0 bg-transparent outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {view === "table" ? (
        <Blueprint className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[13px]">
            <thead>
              <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
                {["Station", "Type", "Status", "Last reading", "Value", "Battery", "Link", "Coordinates", ""].map(
                  (h, i) => (
                    <th
                      key={h || i}
                      className={`border-b border-divider py-3 text-left font-normal uppercase ${
                        i === 0 ? "px-4" : ""
                      } ${h === "Value" ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = SENSOR_STATUS[r.status];
                const ty = SENSOR_TYPE[r.type];
                return (
                  <tr
                    key={r.id}
                    onClick={() => openDrawer(r)}
                    className="cursor-pointer transition-colors hover:bg-neutral-100"
                  >
                    <td className="border-b border-divider px-4 py-2.75">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{r.id}</span>
                        <span className="text-xs text-muted">{r.name}</span>
                      </div>
                    </td>
                    <td className="border-b border-divider">
                      <span className="inline-flex items-center gap-1.5 text-muted">
                        <Icon name={ty.icon} size={14} />
                        {ty.label}
                      </span>
                    </td>
                    <td className="border-b border-divider">
                      <span
                        className="inline-flex items-center gap-1.75 font-mono text-[11px] uppercase tracking-[0.05em]"
                        style={{ color: st.color }}
                      >
                        <span className="size-1.5" style={{ background: st.color }} />
                        {st.label}
                      </span>
                    </td>
                    <td className="border-b border-divider font-mono text-[11.5px] text-muted">{r.last}</td>
                    <td className="border-b border-divider text-right font-mono text-[12.5px]">{r.val}</td>
                    <td className="border-b border-divider">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-11 border border-divider-strong p-px">
                          <div
                            className="h-full"
                            style={{
                              width: `${r.bat}%`,
                              background: r.bat < 20 ? "#D96565" : r.bat < 60 ? "#E7A83B" : "var(--ap-teal)",
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-muted">{r.bat}%</span>
                      </div>
                    </td>
                    <td className="border-b border-divider">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
                        <Icon name={r.status === "off" ? "wifioff" : "wifi"} size={14} />
                        {r.link}
                      </span>
                    </td>
                    <td className="border-b border-divider font-mono text-[11px] text-muted">
                      {r.lat}&deg;N {r.lon}&deg;E
                    </td>
                    <td className="border-b border-divider pr-3.5 text-right text-muted">
                      <Icon name="more" size={16} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-between px-4 py-3 font-mono text-[11px] text-muted">
            <span>Showing {rows.length} of 24</span>
            <span>&lsaquo; 1 2 3 &rsaquo;</span>
          </div>
        </Blueprint>
      ) : (
        <Blueprint className="grid xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative h-[600px]">
            <MapView layer="none" sensors className="absolute inset-0" />
          </div>
          <div className="max-h-[600px] overflow-y-auto border-divider xl:border-l">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => openDrawer(r)}
                className="flex w-full items-center gap-3 border-b border-divider px-4 py-3 text-left transition-colors hover:bg-neutral-100"
              >
                <span className="size-2 flex-none" style={{ background: SENSOR_STATUS[r.status].color }} />
                <span className="flex flex-1 flex-col">
                  <span className="font-mono text-xs">{r.id}</span>
                  <span className="text-xs text-muted">{r.name}</span>
                </span>
                <span className="font-mono text-xs">{r.val}</span>
              </button>
            ))}
          </div>
        </Blueprint>
      )}

      <SensorDrawer key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} row={editing} />
    </div>
  );
}

/* ── Register / edit station ───────────────────────────────────────────── */

function SensorDrawer({
  open,
  onOpenChange,
  row,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: SensorRow | null;
}) {
  const [type, setType] = React.useState<SensorType>(row?.type ?? "soil");
  const [lat, setLat] = React.useState(row?.lat ?? "");
  const [lon, setLon] = React.useState(row?.lon ?? "");
  const [picked, setPicked] = React.useState<string | null>(null);

  function pick(c: MapCell) {
    setLat(c.lat);
    setLon(c.lon);
    setPicked(c.id);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-[var(--ap-scrim)]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.aside
                initial={{ x: 460 }}
                animate={{ x: 0 }}
                exit={{ x: 460 }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
                className="fixed inset-y-0 right-0 z-50 flex w-[min(440px,100vw)] flex-col border-l border-divider-strong bg-surface"
              >
                <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-4.5">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted">
                      {row ? "EDIT STATION" : "REGISTER NEW STATION"}
                    </span>
                    <Dialog.Title className="font-heading text-2xl font-semibold">
                      {row ? row.name : "New sensor"}
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      aria-label="Close"
                      className="grid size-[30px] flex-none place-items-center border border-divider transition-colors hover:border-divider-strong"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Station ID" required>
                      <Input defaultValue={row?.id ?? "ICH-S05"} className="font-mono text-[13px]" />
                    </Field>
                    <Field label="Display name" required>
                      <Input defaultValue={row?.name ?? ""} />
                    </Field>
                  </div>

                  <Field label="Sensor type" required>
                    <div className="grid grid-cols-4 border border-divider">
                      {(Object.keys(SENSOR_TYPE) as SensorType[]).map((k) => {
                        const on = type === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setType(k)}
                            aria-pressed={on}
                            className="flex flex-col items-center gap-1.5 border-r border-divider px-1 py-2.5 text-center text-[11.5px] transition-colors last:border-r-0"
                            style={{
                              background: on ? "var(--ap-accent-100)" : "transparent",
                              color: on ? "var(--ap-text)" : "var(--ap-muted)",
                            }}
                          >
                            <Icon name={SENSOR_TYPE[k].icon} size={16} />
                            {SENSOR_TYPE[k].label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field
                    label="Location"
                    required
                    hint={picked ? "✓ PICKED ON MAP" : "CLICK MAP TO PICK"}
                  >
                    <div className="relative h-[200px] cursor-crosshair border border-divider">
                      <MapView
                        layer="risk"
                        sensors
                        opacity={0.25}
                        onCell={pick}
                        selected={picked}
                        className="absolute inset-0"
                      />
                    </div>
                  </Field>

                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Latitude">
                      <UnitInput unit="&deg;N" value={lat} onChange={(e) => setLat(e.target.value)} />
                    </Field>
                    <Field label="Longitude">
                      <UnitInput unit="&deg;E" value={lon} onChange={(e) => setLon(e.target.value)} />
                    </Field>
                    <Field label="Altitude">
                      <UnitInput unit="m" defaultValue={row?.alt ?? ""} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Reporting interval">
                      <div className="flex h-9 items-center justify-between border border-divider bg-bg px-2.5 font-mono text-[13px]">
                        15 min
                        <Icon name="down" size={14} />
                      </div>
                    </Field>
                    <Field label="Telemetry">
                      <div className="flex h-9 items-center justify-between border border-divider bg-bg px-2.5 text-[13px]">
                        LoRaWAN &middot; EU868
                        <Icon name="down" size={14} />
                      </div>
                    </Field>
                  </div>

                  <Field label="Notes" hint="OPTIONAL">
                    <textarea
                      defaultValue="Mounted 2 m mast, sensor head faces north."
                      className="min-h-[70px] w-full resize-y border border-divider bg-bg p-2.5 text-sm text-ink outline-none transition-colors focus-visible:border-accent"
                    />
                  </Field>
                </div>

                <div className="flex gap-2.5 border-t border-divider px-5 py-4">
                  <Button variant="danger" size="sm">
                    Decommission
                  </Button>
                  <div className="flex-1" />
                  <Dialog.Close asChild>
                    <Button>Cancel</Button>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <Button variant="primary">Save station</Button>
                  </Dialog.Close>
                </div>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
