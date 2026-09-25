"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cx } from "@/components/marketing/lib/cx";

const EASE = [0.22, 1, 0.36, 1] as const;

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.55,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cx(className)}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

type ParsedCount = {
  prefix: string;
  target: number;
  suffix: string;
  decimals: number;
  padZeros: number;
};

function parseCount(value: string): ParsedCount | null {
  const match = value.match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const target = Number(match[2]);
  if (!Number.isFinite(target)) return null;
  const numeric = match[2];
  const decimals = numeric.includes(".") ? numeric.split(".")[1]!.length : 0;
  const integerPart = Math.abs(target).toString();
  const padZeros = Math.max(0, numeric.replace(/\D/g, "").length - integerPart.length);
  return { prefix: match[1], target, suffix: match[3], decimals, padZeros };
}

function formatCount(parsed: ParsedCount, current: number): string {
  const { prefix, target, suffix, decimals, padZeros } = parsed;

  if (decimals > 0) {
    return prefix + current.toFixed(decimals) + suffix;
  }

  const rounded = Math.round(current);
  const sign = target < 0 ? "-" : "";
  const width = String(Math.abs(target)).length + padZeros;
  return prefix + sign + String(Math.abs(rounded)).padStart(width, "0") + suffix;
}

export function CountUp({
  value,
  duration = 0.9,
  className,
}: {
  value: string;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const parsed = useMemo(() => parseCount(value), [value]);
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced || !parsed) return;

    const { target } = parsed;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(target * eased);

      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration, reduced, parsed]);

  const shown = reduced || !parsed ? value : formatCount(parsed, current);

  return <span className={cx(className, "tabular-nums")}>{shown}</span>;
}

export function PulseDot({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <span className={cx("relative inline-flex h-2 w-2", className)} aria-hidden="true">
      <span
        className={cx(
          "absolute inset-0 rounded-full bg-accent-500",
          !reduced && "animate-ping",
        )}
      />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
    </span>
  );
}
