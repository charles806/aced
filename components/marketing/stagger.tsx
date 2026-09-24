"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cx } from "./lib/cx";

export function Stagger({
  children,
  className,
  stagger = 0.09,
  delay = 0,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  amount?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={cx(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cx(className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "left" | "right" | "scale";
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={cx(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cx(className)}
      variants={{
        hidden: { opacity: 0, y: direction === "up" ? 26 : 0, x: direction === "left" ? 32 : direction === "right" ? -32 : 0, scale: direction === "scale" ? 0.96 : 1 },
        show: {
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}