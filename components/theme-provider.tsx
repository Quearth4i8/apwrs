"use client";

import * as React from "react";
import { ThemeProvider as NextThemes, useTheme } from "next-themes";

/**
 * Themes are attribute-driven (`data-theme="dark|light"`) rather than class
 * driven, because the token sheet keys off that attribute and a subtree can
 * then override the page — the marketing pages pin dark, the farmer app
 * pins light, the console lets the operator choose.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      themes={["light", "dark"]}
    >
      {children}
    </NextThemes>
  );
}

export { useTheme };

/** Pins a subtree to one theme regardless of the operator's choice. */
export function ThemeScope({
  theme,
  surface,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { theme: "dark" | "light"; surface?: string }) {
  return (
    <div data-theme={theme} data-surface={surface} className={className} {...props}>
      {children}
    </div>
  );
}

/** Avoids a first-paint flash of the wrong icon in the theme toggle. */
export { useHydrated as useMounted } from "@/lib/hooks";
