"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { Blueprint, Button, PageHeader, RiskBadge, TabStrip, Toggle } from "@/components/ui/primitives";
import { ALERTS, ALERT_RULES } from "@/lib/data";
import { RISK_COLOR, type RiskLevel } from "@/lib/utils";

type Priority = RiskLevel | "all";

const PRIORITIES: { id: Priority; label: string; color: string; n: number }[] = [
  { id: "all", label: "All", color: "var(--ap-muted)", n: 7 },
  { id: "extreme", label: "Extreme", color: RISK_COLOR.extreme, n: 1 },
  { id: "severe", label: "Severe", color: RISK_COLOR.severe, n: 3 },
  { id: "watch", label: "Watch", color: RISK_COLOR.watch, n: 2 },
  { id: "safe", label: "Info", color: RISK_COLOR.safe, n: 1 },
];

export function PageAlerts() {
  const [tab, setTab] = React.useState<"inbox" | "rules">("inbox");
  const [sel, setSel] = React.useState(0);
  const [read, setRead] = React.useState<Record<number, boolean>>({ 4: true, 5: true, 6: true });
  const [prio, setPrio] = React.useState<Priority>("all");
  const [rules, setRules] = React.useState(() => ALERT_RULES.map((r) => r.on));

  const items = ALERTS.map((a, i) => ({ ...a, i })).filter((a) => prio === "all" || a.lv === prio);
  const cur = ALERTS[sel];
  const unread = ALERTS.filter((_, i) => !read[i]).length;

  return (
    <div className="flex flex-col gap-5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader
        kicker={<>MONITOR &middot; ALERTS</>}
        title="Alerts"
        actions={
          <Button onClick={() => setRead(Object.fromEntries(ALERTS.map((_, i) => [i, true])))}>
            <Icon name="check" size={15} />
            Mark all as read
          </Button>
        }
      />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "inbox", label: "Inbox", count: `${unread} unread` },
          { value: "rules", label: "Alert rules", count: 6 },
        ]}
      />

      {tab === "inbox" ? (
        <Blueprint className="grid min-h-[620px] grid-cols-1 xl:grid-cols-[200px_minmax(0,1fr)_400px]">
          {/* Filters */}
          <div className="flex flex-col gap-3.5 border-b border-divider p-2.5 xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-px">
              <div className="px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-faint">PRIORITY</div>
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrio(p.id)}
                  aria-pressed={prio === p.id}
                  className="flex h-[30px] items-center gap-2.25 px-2 text-[13px] transition-colors hover:bg-neutral-100"
                  style={{ background: prio === p.id ? "var(--ap-neutral-100)" : "transparent" }}
                >
                  <span className="size-2" style={{ background: p.color }} />
                  <span className="flex-1 text-left">{p.label}</span>
                  <span className="font-mono text-[11px] text-muted">{p.n}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-px">
              <div className="px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-faint">REGION</div>
              {[
                { l: "Ichkeul", n: 4 },
                { l: "Bizerte", n: 2 },
                { l: "Mateur", n: 1 },
              ].map((r) => (
                <div key={r.l} className="flex h-[30px] items-center gap-2.25 px-2 text-[13px] text-muted">
                  <span className="grid size-3 place-items-center border border-divider-strong">
                    <span className="size-1.5 bg-accent" />
                  </span>
                  <span className="flex-1">{r.l}</span>
                  <span className="font-mono text-[11px]">{r.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex flex-col border-b border-divider xl:border-b-0 xl:border-r">
            <div className="flex items-center gap-2.5 border-b border-divider px-4 py-2.5 font-mono text-[11px] text-muted">
              <span>{items.length} alerts</span>
              <span className="ml-auto">Sort: newest</span>
            </div>
            {items.map((a) => {
              const isUnread = !read[a.i];
              const on = sel === a.i;
              return (
                <button
                  key={a.i}
                  onClick={() => {
                    setSel(a.i);
                    setRead((r) => ({ ...r, [a.i]: true }));
                  }}
                  className="grid grid-cols-[10px_minmax(0,1fr)_auto] gap-3 border-b border-divider px-4 py-3.25 text-left transition-colors hover:bg-neutral-100"
                  style={{
                    background: on ? "var(--ap-neutral-100)" : "transparent",
                    boxShadow: `inset 2px 0 0 ${on ? "var(--ap-accent)" : "transparent"}`,
                  }}
                >
                  <span
                    className="mt-1.75 size-1.5"
                    style={{ background: isUnread ? "var(--ap-accent)" : "transparent" }}
                  />
                  <span className="flex min-w-0 flex-col gap-1.25">
                    <span className="flex items-center gap-2">
                      <RiskBadge level={a.lv} />
                      <span className="font-mono text-[10.5px] text-muted">{a.r}</span>
                    </span>
                    <span
                      className="truncate text-[13.5px]"
                      style={{ fontWeight: isUnread ? 600 : 400 }}
                    >
                      {a.t}
                    </span>
                    <span className="truncate text-xs text-muted">{a.d}</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted">{a.time}</span>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          <motion.div key={sel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
            <div className="flex flex-col gap-2.5 border-b border-divider p-5">
              <div className="flex items-center gap-2">
                <RiskBadge level={cur.lv} />
                <span className="font-mono text-[11px] text-muted">
                  {cur.r} &middot; {cur.time}
                </span>
              </div>
              <div className="font-heading text-2xl font-semibold leading-[1.1]">{cur.t}</div>
              <div className="text-[13.5px] leading-[1.55] text-muted">{cur.body}</div>
            </div>
            <div className="grid grid-cols-2 border-b border-divider">
              {cur.facts.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.75 border-b border-divider px-5 py-3">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-muted">{k}</span>
                  <span className="font-mono text-sm">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2.5 p-5">
              <span className="font-mono text-[10px] tracking-[0.1em] text-muted">RECOMMENDED ACTION</span>
              <div className="text-[13.5px] leading-[1.55]">{cur.act}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" className="h-[34px]">
                  <Icon name="map" size={14} />
                  Show on map
                </Button>
                <Button size="sm" className="h-[34px]">
                  Snooze 24 h
                </Button>
              </div>
            </div>
          </motion.div>
        </Blueprint>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13.5px] text-muted">
              Rules are evaluated after every model run (06:00 and 18:00 UTC) and on each sensor reading.
            </span>
            <Button variant="primary" size="sm" className="h-[34px]">
              <Icon name="plus" size={14} />
              New rule
            </Button>
          </div>
          <Blueprint className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] tracking-[0.08em] text-muted">
                  {["Rule", "Condition", "Priority", "Scope", "Channels", "Enabled"].map((h, i) => (
                    <th
                      key={h}
                      className={`border-b border-divider py-3 text-left font-normal uppercase ${i === 0 ? "px-4" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALERT_RULES.map((r, i) => (
                  <tr key={r.n} className="transition-colors hover:bg-neutral-100">
                    <td className="border-b border-divider px-4 py-3 font-medium">{r.n}</td>
                    <td className="border-b border-divider">
                      <code className="border border-divider bg-neutral-100 px-1.75 py-0.75 font-mono text-[11.5px]">
                        {r.c}
                      </code>
                    </td>
                    <td className="border-b border-divider">
                      <RiskBadge level={r.lv} />
                    </td>
                    <td className="border-b border-divider text-muted">{r.s}</td>
                    <td className="border-b border-divider font-mono text-[11px] text-muted">{r.ch}</td>
                    <td className="border-b border-divider">
                      <Toggle
                        checked={rules[i]}
                        onChange={(v) => setRules((rs) => rs.map((x, j) => (j === i ? v : x)))}
                        label={`Enable ${r.n}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Blueprint>
        </>
      )}
    </div>
  );
}
