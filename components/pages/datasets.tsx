"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { Blueprint, Button, PageHeader, TabStrip } from "@/components/ui/primitives";
import { ACTIVITY_LOG, DATASETS, DATASET_STATUS } from "@/lib/data";

const SOURCES = ["All", "CHIRPS", "ERA5-Land", "Sentinel", "MODIS", "SMAP", "Field sensors", "Upload", "Manual"];

export function PageDatasets({ tab: initial }: { tab: "datasets" | "activity" }) {
  const [tab, setTab] = React.useState(initial);
  const [src, setSrc] = React.useState("All");
  const [q, setQ] = React.useState("");

  const rows = DATASETS.filter(
    (d) =>
      (src === "All" || d[2] === src) &&
      (!q || d[1].toLowerCase().includes(q.toLowerCase()) || d[0].toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="flex flex-col gap-5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={tab === "datasets" ? "DATA · DATASETS · 10 SOURCES" : "DATA · ACTIVITY LOG · LAST 7 DAYS"}
        title={tab === "datasets" ? "Datasets" : "Activity log"}
        actions={
          <Button>
            <Icon name="download" size={15} />
            Export
          </Button>
        }
      />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "datasets", label: "Datasets", count: 142 },
          { value: "activity", label: "Activity log", count: "7 d" },
        ]}
      />

      {tab === "datasets" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 w-[260px] items-center gap-2 border border-divider px-2.5 focus-within:border-accent">
              <span className="text-muted">
                <Icon name="search" size={14} />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search datasets"
                aria-label="Search datasets"
                className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-muted"
              />
            </div>
            {SOURCES.map((s) => {
              const on = src === s;
              return (
                <button
                  key={s}
                  onClick={() => setSrc(s)}
                  aria-pressed={on}
                  className="flex h-8 items-center border px-2.75 text-[12.5px] transition-colors hover:border-divider-strong"
                  style={{
                    borderColor: on ? "color-mix(in srgb, var(--ap-accent) 45%, transparent)" : "var(--ap-divider)",
                    background: on ? "var(--ap-accent-100)" : "transparent",
                    color: on ? "var(--ap-text)" : "var(--ap-muted)",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>

          <Blueprint className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
                  {["Dataset", "Source", "Type", "Records", "Period", "Status", "User", "Updated"].map((h, i) => (
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
                  <tr key={d[0]} className="cursor-pointer transition-colors hover:bg-neutral-100">
                    <td className="border-b border-divider px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-medium">{d[1]}</span>
                        <span className="font-mono text-[10.5px] text-muted">{d[0]}</span>
                      </div>
                    </td>
                    <td className="border-b border-divider">
                      <span className="border border-divider px-1.75 py-0.5 font-mono text-[11px]">{d[2]}</span>
                    </td>
                    <td className="border-b border-divider text-muted">{d[3]}</td>
                    <td className="border-b border-divider text-right font-mono">{d[4]}</td>
                    <td className="border-b border-divider font-mono text-[11.5px] text-muted">{d[5]}</td>
                    <td className="border-b border-divider">
                      <span
                        className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.05em]"
                        style={{ color: DATASET_STATUS[d[6]] }}
                      >
                        <span className="size-1.5" style={{ background: DATASET_STATUS[d[6]] }} />
                        {d[6]}
                      </span>
                    </td>
                    <td className="border-b border-divider text-[12.5px]">{d[7]}</td>
                    <td className="border-b border-divider pr-4 font-mono text-[11px] text-muted">{d[8]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <div className="flex flex-col items-center gap-2 p-12 text-muted">
                <Icon name="database" size={22} />
                <span className="text-sm text-ink">No datasets match</span>
                <span className="text-[12.5px]">Clear the search or pick another source.</span>
              </div>
            )}
          </Blueprint>
        </>
      ) : (
        <Blueprint className="overflow-x-auto">
          <div className="min-w-[760px]">
            {ACTIVITY_LOG.map(([t, icon, c, u, role, a, ref]) => (
              <div
                key={`${t}-${ref}`}
                className="grid grid-cols-[120px_28px_200px_minmax(0,1fr)_200px] items-center gap-3.5 border-b border-divider px-4.5 py-3"
              >
                <span className="font-mono text-[11px] text-muted">{t}</span>
                <span className="grid size-6.5 place-items-center border border-divider" style={{ color: c }}>
                  <Icon name={icon} size={13} />
                </span>
                <span className="text-[13px]">
                  <span className="font-medium">{u}</span> <span className="text-muted">{role}</span>
                </span>
                <span className="text-[13px]">{a}</span>
                <span className="text-right font-mono text-[11px] text-muted">{ref}</span>
              </div>
            ))}
          </div>
        </Blueprint>
      )}
    </div>
  );
}
