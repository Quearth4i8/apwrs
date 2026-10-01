"use client";

import * as React from "react";
import { PageHeader, TabStrip } from "@/components/ui/primitives";
import { NoData } from "@/components/ui/no-data";

/**
 * Alerts need a rules engine evaluating thresholds against each model run and
 * a store of what has fired. Neither exists yet, so rather than showing a
 * convincing inbox of invented incidents, the page says what is missing.
 */
export function PageAlerts() {
  const [tab, setTab] = React.useState<"inbox" | "rules">("inbox");

  return (
    <div className="flex flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader title="Alerts" lede="Warnings when drought or soil moisture crosses a limit you set." />

      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "inbox", label: "Inbox" },
          { value: "rules", label: "Alert rules" },
        ]}
      />

      {tab === "inbox" ? (
        <NoData
          icon="bell"
          title="No alerts have been raised"
          what="Nothing is evaluating thresholds against model runs yet, so there is no alert history to show. The drought indices these rules would watch — SPEI-3, SPI-3 and the composite risk surface — are already computed and visible on Drought Risk and Historical Comparison."
          needs="an alert rules engine"
        />
      ) : (
        <NoData
          icon="settings"
          title="No rules defined"
          what="A rule pairs a condition on an index or a sensor reading with a delivery channel. Defining them needs somewhere to persist them and a scheduler to evaluate them after each run."
          needs="an alert rules engine"
        />
      )}
    </div>
  );
}
