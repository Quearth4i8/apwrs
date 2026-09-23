"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * Dropdowns are Radix primitives underneath, so they carry real roving
 * focus, typeahead, Escape/outside-dismiss and correct ARIA. The surface is
 * the same soft-edged surface the page panels use, with a short fade-and-rise
 * on open driven by Radix's data-state.
 */

const SURFACE =
  "z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-panel border border-panel-border " +
  "bg-s2 p-1.5 text-ink shadow-pop outline-none " +
  "data-[state=open]:animate-[pop-in_0.16s_var(--ease-out-expo)_both] " +
  "data-[state=closed]:opacity-0 data-[state=closed]:transition-opacity data-[state=closed]:duration-100";

const ITEM =
  "relative flex h-8 cursor-pointer select-none items-center gap-2 rounded-inset px-2.5 text-[13px] outline-none " +
  "transition-colors duration-100 data-[highlighted]:bg-s3 data-[disabled]:pointer-events-none data-[disabled]:opacity-45";

/* ── Trigger surface shared by the header controls ───────────────────── */

export const MenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(function MenuTrigger({ className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "flex h-8 items-center gap-2 rounded-control border border-divider px-2.5 text-[13px] text-ink",
        "transition-colors duration-150 hover:border-divider-strong hover:bg-neutral-100",
        "data-[state=open]:border-accent data-[state=open]:bg-accent-100",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

/* ── Simple menu (user menu, export, season) ─────────────────────────── */

export function Menu({
  trigger,
  children,
  align = "start",
  className,
  sideOffset = 8,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  sideOffset?: number;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={sideOffset} className={cn(SURFACE, className)}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu.Label className="px-2.5 py-1.5 font-mono text-[10px] tracking-[0.1em] text-faint">
      {children}
    </DropdownMenu.Label>
  );
}

export function MenuItem({
  children,
  icon,
  hint,
  onSelect,
  className,
  destructive,
}: {
  children: React.ReactNode;
  icon?: IconName;
  hint?: React.ReactNode;
  onSelect?: () => void;
  className?: string;
  destructive?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(ITEM, destructive && "text-extreme-ink", className)}
    >
      {icon && <Icon name={icon} size={14} />}
      <span className="flex-1">{children}</span>
      {hint && <span className="font-mono text-[10.5px] text-muted">{hint}</span>}
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1.5 h-px bg-divider" />;
}

/* ── Popover panel (the two-pane site picker) ────────────────────────── */

export function Popover({
  trigger,
  children,
  align = "start",
  className,
  sideOffset = 8,
  open,
  onOpenChange,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  sideOffset?: number;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "z-50 overflow-hidden rounded-panel border border-panel-border bg-s2 text-ink shadow-pop outline-none",
            "data-[state=open]:animate-[pop-in_0.16s_var(--ease-out-expo)_both]",
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export const PopoverClose = PopoverPrimitive.Close;

/** A row inside a popover list — same affordance as MenuItem without the menu. */
export function PopoverRow({
  children,
  onClick,
  selected,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-2 text-left text-[13px] transition-colors duration-100",
        selected ? "bg-s3" : "hover:bg-s3",
        className,
      )}
    >
      {children}
    </button>
  );
}
