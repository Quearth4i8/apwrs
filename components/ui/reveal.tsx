"use client";

import * as React from "react";
import { motion } from "motion/react";

/**
 * A page's entrance: each direct child rises into place in turn, the same
 * stagger the Overview, Forecasts and Planting pages use. Wrap a page's
 * column of sections in it; children that render nothing are skipped.
 */
export function Reveal({
  children,
  className,
  itemClassName,
  step = 0.06,
}: {
  children: React.ReactNode;
  className?: string;
  /** Classes for each child's wrapper, e.g. "h-full" so grid cards stay level. */
  itemClassName?: string;
  /** Seconds between one section and the next. */
  step?: number;
}) {
  let i = 0;
  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (child == null || child === false || child === true) return null;
        const delay = Math.min(i++ * step, 0.5);
        return (
          <motion.div
            className={itemClassName}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {child}
          </motion.div>
        );
      })}
    </div>
  );
}
