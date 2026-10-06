"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * The app's dropdown field: a bordered trigger showing the current choice,
 * opening onto a themed list. Radix underneath, so it keeps the native
 * select's keyboard behaviour (arrows, typeahead, Escape) and ARIA, without
 * the browser's unstyled popup.
 *
 * Options can carry a leading visual (a swatch, an icon, a photo) and a hint
 * shown at the right of the row.
 */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  leading?: React.ReactNode;
  hint?: React.ReactNode;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  placeholder,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly SelectOption<T>[];
  /** Accessible name when there is no visible <label> tied to it. */
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <SelectPrimitive.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          "group flex h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-divider bg-bg px-3.5 text-left text-[14.5px] text-ink outline-none",
          "transition-[border-color,box-shadow] duration-150",
          "hover:border-[color-mix(in_srgb,var(--ap-accent)_50%,transparent)] focus-visible:border-[var(--ap-accent)]",
          "data-[state=open]:border-[var(--ap-accent)] data-[state=open]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ap-accent)_18%,transparent)]",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {current?.leading && <span className="flex flex-none items-center">{current.leading}</span>}
          <span className="truncate">
            <SelectPrimitive.Value placeholder={placeholder}>{current?.label}</SelectPrimitive.Value>
          </span>
        </span>
        <SelectPrimitive.Icon className="flex-none text-muted transition-transform duration-150 group-data-[state=open]:rotate-180">
          <Icon name="down" size={15} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "z-50 max-h-[min(340px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-[200px] overflow-hidden",
            "rounded-panel border border-panel-border bg-s2 text-ink shadow-pop",
            "data-[state=open]:animate-[pop-in_0.16s_var(--ease-out-expo)_both]",
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-muted">
            <Icon name="up" size={14} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className={cn(
                  "relative flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-inset px-2.5 text-[13.5px] outline-none",
                  "transition-colors duration-100 data-[highlighted]:bg-s3",
                  "data-[state=checked]:bg-accent-100 data-[state=checked]:font-semibold",
                  "data-[state=checked]:before:absolute data-[state=checked]:before:inset-y-2 data-[state=checked]:before:left-0 data-[state=checked]:before:w-[3px] data-[state=checked]:before:rounded-full data-[state=checked]:before:bg-[var(--ap-accent)]",
                )}
              >
                {o.leading && <span className="flex flex-none items-center">{o.leading}</span>}
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                {o.hint && <span className="ml-auto pl-3 text-[12px] font-normal text-muted">{o.hint}</span>}
                <SelectPrimitive.ItemIndicator className={cn("text-accent", o.hint ? "pl-1.5" : "ml-auto")}>
                  <Icon name="check" size={14} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-muted">
            <Icon name="down" size={14} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
