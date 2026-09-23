"use client";

import * as React from "react";
import { Panel, PageHeader, TabStrip } from "@/components/ui/primitives";
import { NoData, Provenance } from "@/components/ui/no-data";
import { climateFile, CROPS, STATIONS } from "@/lib/climate";

/**
 * The only datasets that genuinely exist are the two station workbooks this
 * build was derived from, so those are what the catalogue lists. The activity
 * log needs an audit trail nothing is writing to yet.
 */
export function PageDatasets({ tab: initial }: { tab: "datasets" | "activity" }) {
  const [tab, setTab] = React.useState(initial);

  const rows = STATIONS.map((s) => ({
    id: s.id,
    name: `${s.name} daily climate record`,
    source: "Station workbook",
    type: "Climate",
    records: s.coverage.days,
    period: `${s.coverage.from} → ${s.coverage.to}`,
    fields: "P, Tmin/Tmean/Tmax, RH, Rs, wind, ET₀",
  }));

  return (
    <div className="flex flex-col gap-5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={tab === "datasets" ? <>DATA &middot; DATASETS</> : <>DATA &middot; ACTIVITY LOG</>}
        title={tab === "datasets" ? "Datasets" : "Activity log"}
      />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "datasets", label: "Datasets", count: rows.length },
          { value: "activity", label: "Activity log" },
        ]}
      />

      {tab === "datasets" ? (
        <>
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
                  {["Dataset", "Source", "Type", "Records", "Period", "Fields"].map((h, i) => (
                    <th
                      key={h}
                      className={`border-b border-divider py-2.75 font-normal uppercase ${
                        i === 0 ? "px-4 text-left" : h === "Records" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-neutral-100">
                    <td className="border-b border-divider px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-medium">{d.name}</span>
                        <span className="font-mono text-[10.5px] text-muted">{d.id}</span>
                      </div>
                    </td>
                    <td className="border-b border-divider">
                      <span className="border border-divider px-1.75 py-0.5 font-mono text-[11px]">{d.source}</span>
                    </td>
                    <td className="border-b border-divider text-muted">{d.type}</td>
                    <td className="border-b border-divider text-right font-mono">
                      {d.records.toLocaleString("en-GB")}
                    </td>
                    <td className="border-b border-divider font-mono text-[11.5px] text-muted">{d.period}</td>
                    <td className="border-b border-divider pr-4 font-mono text-[11px] text-muted">{d.fields}</td>
                  </tr>
                ))}
                <tr className="transition-colors hover:bg-neutral-100">
                  <td className="border-b border-divider px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="font-medium">Crop coefficients</span>
                      <span className="font-mono text-[10.5px] text-muted">FAO-56</span>
                    </div>
                  </td>
                  <td className="border-b border-divider">
                    <span className="border border-divider px-1.75 py-0.5 font-mono text-[11px]">Station workbook</span>
                  </td>
                  <td className="border-b border-divider text-muted">Agricultural</td>
                  <td className="border-b border-divider text-right font-mono">{CROPS.length}</td>
                  <td className="border-b border-divider font-mono text-[11.5px] text-muted">&mdash;</td>
                  <td className="border-b border-divider pr-4 font-mono text-[11px] text-muted">
                    K<sub>c</sub> ini/mid/end, stage lengths
                  </td>
                </tr>
                <tr className="transition-colors hover:bg-neutral-100">
                  <td className="border-b border-divider px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="font-medium">Live risk surface</span>
                      <span className="font-mono text-[10.5px] text-muted">/api/grid</span>
                    </div>
                  </td>
                  <td className="border-b border-divider">
                    <span className="border border-divider px-1.75 py-0.5 font-mono text-[11px]">Open-Meteo</span>
                  </td>
                  <td className="border-b border-divider text-muted">Gridded</td>
                  <td className="border-b border-divider text-right font-mono">320</td>
                  <td className="border-b border-divider font-mono text-[11.5px] text-muted">rolling 30 d</td>
                  <td className="border-b border-divider pr-4 font-mono text-[11px] text-muted">
                    P, ET&#8320;, Tmax, soil moisture
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>

          <Provenance>
            Generated {new Date(climateFile.generatedAt).toISOString().slice(0, 10)} &middot; everything the app
            reads from is listed here
          </Provenance>
        </>
      ) : (
        <NoData
          icon="activity"
          title="No activity recorded"
          what="An activity log needs an audit trail — who changed what, and when. Nothing is writing one yet, and the actions it would record (uploads, edits, role changes) are not wired to storage."
          needs="audit trail + persistence"
        />
      )}
    </div>
  );
}
