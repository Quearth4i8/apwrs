"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Panel, Button, Field, Input, PageHeader, UnitInput } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/no-data";
import { stationForSite } from "@/lib/climate";

/**
 * A blank observation form. The fields are exactly the seven variables the
 * stations measure, so an entry could slot straight into the record — but
 * nothing persists it yet, and the form says so rather than pretending.
 *
 * The prototype pre-filled every box with invented readings; it starts empty.
 */

const FIELDS = [
  { key: "precip", label: "Precipitation", unit: "mm", required: true },
  { key: "tmin", label: "Minimum temperature", unit: "°C", required: true },
  { key: "tmean", label: "Mean temperature", unit: "°C", required: true },
  { key: "tmax", label: "Maximum temperature", unit: "°C", required: true },
  { key: "rh", label: "Relative humidity", unit: "%", required: false },
  { key: "rs", label: "Solar radiation", unit: "MJ/m²", required: false },
  { key: "wind", label: "Wind speed @2 m", unit: "m/s", required: false },
] as const;

export function PageManual() {
  const { site } = useConsole();
  const station = stationForSite(site.name);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [date, setDate] = React.useState("");
  const [tried, setTried] = React.useState(false);

  const filled = FIELDS.filter((f) => values[f.key]?.trim()).length;
  const missing = FIELDS.filter((f) => f.required && !values[f.key]?.trim()).length;

  return (
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader title="Manual entry" lede={<>Record one day of weather at {station.name}.</>} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="flex flex-col">
          <div className="flex flex-col gap-0.5 border-b border-divider px-5 py-4">
            <span className="text-[16px] font-semibold">One day of weather</span>
            <span className="text-[13px] text-muted">The same measurements the station records every day</span>
          </div>

          <div className="grid gap-4 border-b border-divider p-5 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Date" required error={tried && !date ? "Required" : undefined}>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-[13.5px]"
              />
            </Field>
            <Field label="Station">
              <div className="flex h-9 items-center rounded-control bg-neutral-100 px-3 text-[13.5px] text-muted">
                {station.name}
              </div>
            </Field>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {FIELDS.map((f) => {
              const err = tried && f.required && !values[f.key]?.trim();
              return (
                <Field
                  key={f.key}
                  label={f.label}
                  required={f.required}
                  hint={f.required ? "" : "Optional"}
                  error={err ? "Required" : undefined}
                >
                  <UnitInput
                    unit={f.unit}
                    inputMode="decimal"
                    value={values[f.key] ?? ""}
                    placeholder={f.required ? "Required" : "—"}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    style={err ? { borderColor: "#D96565" } : undefined}
                  />
                </Field>
              );
            })}
          </div>

          <div className="border-t border-divider px-5 py-3.5 text-[12.5px] leading-[1.5] text-muted">
            Evaporation (ET&#8320;) is worked out from temperature, humidity, sunlight and wind, so you don&rsquo;t
            enter it.
          </div>
        </Panel>

        <Panel className="flex flex-col xl:sticky xl:top-5">
          <div className="flex items-baseline justify-between border-b border-divider px-4.5 py-4">
            <span className="text-[16px] font-semibold">Summary</span>
            <span className="text-[12.5px] text-muted">
              {filled} of {FIELDS.length} filled
            </span>
          </div>

          <div className="flex flex-col gap-2 border-b border-divider px-4.5 py-3">
            {FIELDS.filter((f) => values[f.key]?.trim()).map((f) => (
              <div key={f.key} className="flex justify-between gap-3 text-[13px] text-muted">
                <span className="truncate">{f.label}</span>
                <span className="whitespace-nowrap font-semibold text-ink">
                  {values[f.key]} {f.unit}
                </span>
              </div>
            ))}
            {filled === 0 && <span className="text-[12.5px] text-muted">Nothing entered yet.</span>}
          </div>

          <div className="flex flex-col gap-2.5 px-4.5 py-3.5">
            {tried && missing > 0 && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "#E7A83B" }}>
                <Icon name="alert" size={13} />
                {missing} required field{missing > 1 ? "s" : ""} still empty
              </div>
            )}
            <div className="flex items-start gap-2 rounded-[12px] bg-neutral-100 px-3 py-2.5 text-[12.5px] leading-[1.45] text-muted">
              <span className="mt-0.5 flex-none text-faint">
                <Icon name="info" size={13} />
              </span>
              <span>
                Saving is not connected yet, so entries are checked but not stored.
              </span>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={() => setTried(true)} disabled>
              Save observation
            </Button>
          </div>
        </Panel>
      </div>

      <Provenance>
        Same fields as {station.name}&rsquo;s {station.coverage.days.toLocaleString("en-GB")} days on record
      </Provenance>
    </div>
  );
}
