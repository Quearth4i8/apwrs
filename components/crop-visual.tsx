"use client";

import * as React from "react";
import { Bean, Carrot, Cherry, Flower2, Sprout, Wheat, type LucideIcon } from "lucide-react";
import type { CalendarCrop, Family } from "@/lib/crop-calendar";
import { cn } from "@/lib/utils";

/**
 * A crop's photo, from public/images/crops/<id>.jpg. Until a photo is there
 * — or if it fails to load — a tinted tile with the crop family's icon
 * stands in, so the layout never shows a broken image.
 */

const FAMILY_LOOK: Record<Family, { icon: LucideIcon; from: string; to: string }> = {
  cereal: { icon: Wheat, from: "#E9C46A", to: "#B5863B" },
  legume: { icon: Bean, from: "#9BC27A", to: "#4E8A3E" },
  oilseed: { icon: Flower2, from: "#F4D35E", to: "#D9A520" },
  allium: { icon: Sprout, from: "#E8DCCB", to: "#B9A58B" },
  root: { icon: Carrot, from: "#C8557A", to: "#7A2E4F" },
  "fruit-veg": { icon: Cherry, from: "#F08A5D", to: "#C8423A" },
};

export function CropImage({ crop, className, iconSize = 34 }: { crop: CalendarCrop; className?: string; iconSize?: number }) {
  const [failed, setFailed] = React.useState(false);
  const look = FAMILY_LOOK[crop.family];
  const FallbackIcon = look.icon;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* The tile sits underneath, so it shows while the photo loads too. */}
      <div
        className="absolute inset-0 grid place-items-center text-white/90"
        style={{ background: `linear-gradient(135deg, ${look.from}, ${look.to})` }}
      >
        <FallbackIcon size={iconSize} strokeWidth={1.6} />
      </div>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element -- user-supplied photos of unknown size
        <img
          src={crop.image}
          alt={crop.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      )}
    </div>
  );
}
