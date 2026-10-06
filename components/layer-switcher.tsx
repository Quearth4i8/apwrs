"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@/components/icon";
import { MAP_LAYERS, LAYER, type LayerKey } from "@/lib/map-layers";
import { cn } from "@/lib/utils";

/**
 * The map's layer picker: a floating pill over the map showing the current
 * layer, opening onto every layer with a swatch of its colour ramp.
 */
export function LayerSwitcher({
  value,
  onChange,
  className,
}: {
  value: LayerKey;
  onChange: (v: LayerKey) => void;
  className?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Map layer"
          className={cn(
            "group flex h-9 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--ap-bg)_90%,transparent)] pl-2 pr-3 text-[13px] text-ink shadow-pop outline-none backdrop-blur-md transition-colors",
            "hover:bg-[var(--ap-bg)] focus-visible:ring-2 focus-visible:ring-[var(--ap-accent)] data-[state=open]:bg-[var(--ap-bg)]",
            className,
          )}
        >
          <span className="grid size-6 place-items-center rounded-full bg-accent-100 text-accent">
            <Icon name="layers" size={14} />
          </span>
          <span className="font-semibold">{LAYER[value].label}</span>
          <span className="text-muted transition-transform duration-150 group-data-[state=open]:rotate-180">
            <Icon name="down" size={14} />
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 w-[260px] rounded-panel border border-panel-border bg-s2 p-1.5 text-ink shadow-pop outline-none data-[state=open]:animate-[pop-in_0.16s_var(--ease-out-expo)_both]"
        >
          <div className="px-2.5 pb-1.5 pt-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Map layer</div>
          {MAP_LAYERS.map((l) => {
            const on = l.key === value;
            return (
              <DropdownMenu.Item
                key={l.key}
                onSelect={() => onChange(l.key)}
                className={cn(
                  "relative flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-inset px-2.5 text-[13px] outline-none transition-colors duration-100 data-[highlighted]:bg-s3",
                  on &&
                    "bg-accent-100 font-semibold before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--ap-accent)]",
                )}
              >
                <span
                  className="h-2.5 w-7 flex-none rounded-full"
                  style={{ background: `linear-gradient(to right, ${l.ramp.join(", ")})` }}
                />
                <span className="flex-1 truncate">{l.label}</span>
                {on && (
                  <span className="text-accent">
                    <Icon name="check" size={14} />
                  </span>
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
