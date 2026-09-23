"use client";

import { FarmerContent } from "@/components/farmer-content";
import { useConsole } from "@/components/app-context";
import type { FarmerTab } from "@/lib/data";

/**
 * The farmer screens as they appear inside the console shell: no chrome of
 * their own, and no palette of their own either — they take the console's
 * theme, so the EN/FR and dark/light switches in the header drive them.
 */
export function FarmerPane({ tab }: { tab: FarmerTab }) {
  const { lang } = useConsole();
  return <FarmerContent tab={tab} lang={lang} />;
}
