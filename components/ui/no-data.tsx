"use client";

import { Icon, type IconName } from "@/components/icon";
import { Panel } from "@/components/ui/primitives";

/**
 * Shown wherever the product would otherwise display figures it does not
 * have. An empty panel that says what is missing is more useful than a
 * plausible-looking table nobody can trust, and it names the source that
 * would fill it so the gap is actionable.
 */
export function NoData({
  title,
  what,
  needs,
  icon = "database",
  className,
}: {
  title: string;
  what: string;
  needs: string;
  icon?: IconName;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-[12px] bg-accent-100 text-accent">
          <Icon name={icon} size={22} strokeWidth={1.8} />
        </span>
        <span className="text-xl font-semibold">{title}</span>
        <p className="m-0 max-w-[52ch] text-[13.5px] leading-[1.6] text-muted">{what}</p>
        <span className="mt-1 rounded-full bg-neutral-100 px-3 py-1 text-[12.5px] text-muted">Needs: {needs}</span>
      </div>
    </Panel>
  );
}

/** Marks a figure that is modelled rather than measured. */
export function Derived({ title }: { title: string }) {
  return (
    <span title={title} className="cursor-help text-[11px] text-faint">
      {" "}
      &#8225;
    </span>
  );
}

/** A short provenance line for panels that do carry real figures. */
export function Provenance({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-faint">
      <Icon name="info" size={13} />
      {children}
    </div>
  );
}
