"use client";

import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

/** Field outline and fill on the satellite basemap, legible over any crop. */
export const LAND_FILL = "#2BD4C9";
export const LAND_LINE = "#3EE0D5";
export const LAND_SELECTED = "#FFD166";

/** The map pin for a farmer's field: a red drop with a sprout. Anchor it at the bottom. */
export function LandPin({ active = false, label, className }: { active?: boolean; label?: string; className?: string }) {
  return (
    <span
      className={cn("relative block cursor-pointer transition-transform duration-150 hover:scale-110", active && "scale-110", className)}
      title={label}
    >
      <svg width={30} height={38} viewBox="0 0 30 38" className="block drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)]">
        <path
          d="M15 37C15 37 2 22.6 2 14a13 13 0 0 1 26 0c0 8.6-13 23-13 23Z"
          fill={active ? "#B8322C" : "#D9443C"}
          stroke="#fff"
          strokeWidth={2}
        />
        <circle cx={15} cy={14} r={8.5} fill="#fff" />
      </svg>
      <span className="absolute left-1/2 top-[6px] -translate-x-1/2 text-[#3E9B4F]">
        <Sprout size={15} strokeWidth={2.4} />
      </span>
    </span>
  );
}
