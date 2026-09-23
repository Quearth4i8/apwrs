"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { useConsole } from "@/components/app-context";
import { Blueprint, Button, Field, Input, PageHeader, UnitInput } from "@/components/ui/primitives";
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
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={<>DATA &middot; MANUAL ENTRY</>}
        title="Manual entry"
        lede={
          <>
            Record one day of observations for {station.name}. Fields match the seven variables the station record
            already carries, so nothing has to be reconciled later.
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Blueprint className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3.5">
            <span className="font-heading text-lg font-semibold">Observation</span>
            <span className="font-mono text-[10.5px] text-muted">
              {station.name.toUpperCase()} &middot; {station.lat.toFixed(3)}&deg;N {station.lon.toFixed(3)}&deg;E
            </span>
          </div>

          <div className="grid gap-4 border-b border-divider p-5 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Date" required error={tried && !date ? "Required" : undefined}>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="font-mono text-[13px]"
              />
            </Field>
            <Field label="Station">
              <div className="flex h-9 items-center border border-divider bg-bg px-2.5 font-mono text-[13px] text-muted">
                {station.id}
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
                  hint={f.required ? "" : "OPTIONAL"}
                  error={err ? "Required" : undefined}
                >
                  <UnitInput
                    unit={f.unit}
                    inputMode="decimal"
                    value={values[f.key] ?? ""}
                    placeholder={f.required ? "required" : "—"}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    style={err ? { borderColor: "#D96565" } : undefined}
                  />
                </Field>
              );
            })}
          </div>

          <div className="border-t border-divider px-5 py-3.5 text-[12.5px] leading-[1.5] text-muted">
            ET&#8320; is not entered by hand &mdash; it is computed from temperature, humidity, radiation and wind by
            FAO-56 Penman&ndash;Monteith once the other values are present.
          </div>
        </Blueprint>

        <Blueprint className="flex flex-col xl:sticky xl:top-5">
          <div className="flex items-baseline justify-between border-b border-divider px-4.5 py-3.5">
            <span className="font-heading text-lg font-semibold">Summary</span>
            <span className="font-mono text-[10.5px] text-muted">
              {filled} / {FIELDS.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 border-b border-divider px-4.5 py-3">
            {FIELDS.filter((f) => values[f.key]?.trim()).map((f) => (
              <div key={f.key} className="flex justify-between gap-3 font-mono text-[11px] text-muted">
                <span className="truncate">{f.label}</span>
                <span className="whitespace-nowrap text-ink">
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
            <div className="flex items-start gap-2 border border-divider px-3 py-2.5 text-[12px] leading-[1.45] text-muted">
              <span className="mt-0.5 flex-none text-faint">
                <Icon name="info" size={13} />
              </span>
              <span>
                Submissions are not stored. There is no write path into the record yet, so this form validates but
                cannot save.
              </span>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={() => setTried(true)} disabled>
              Save observation
            </Button>
          </div>
        </Blueprint>
      </div>

      <Provenance>
        Field list mirrors {station.name}&rsquo;s measured variables &middot;{" "}
        {station.coverage.days.toLocaleString("en-GB")} days on record
      </Provenance>
    </div>
  );
}
