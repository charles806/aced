"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cx } from "./lib/cx";

export type RevealDirection = "up" | "down" | "left" | "right" | "scale";

const INITIAL: Record<
  RevealDirection,
  { opacity: number; x: number; y: number; scale: number }
> = {
  up: { opacity: 0, x: 0, y: 28, scale: 1 },
  down: { opacity: 0, x: 0, y: -28, scale: 1 },
  left: { opacity: 0, x: 40, y: 0, scale: 1 },
  right: { opacity: 0, x: -40, y: 0, scale: 1 },
  scale: { opacity: 0, x: 0, y: 12, scale: 0.965 },
};

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.65,
  once = true,
  className,
  amount = 0.25,
}: {
  children: ReactNode;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
  amount?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cx(className)}
      initial={INITIAL[direction]}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}