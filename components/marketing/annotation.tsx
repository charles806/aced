import type { ReactNode } from "react";
import { cx } from "./lib/cx";

type AnnotationVariant = "tape" | "pin" | "plain";

export function Annotation({
  children,
  variant = "tape",
  tilt = -2,
  className,
  labelClassName,
}: {
  children: ReactNode;
  variant?: AnnotationVariant;
  tilt?: number;
  className?: string;
  labelClassName?: string;
}) {
  const style: React.CSSProperties = { "--tilt": `${tilt}deg` } as React.CSSProperties;

  if (variant === "plain") {
    return (
      <span
        style={style}
        className={cx(
          "inline-flex rotate-[var(--tilt)] items-center gap-1.5 font-display text-sm font-medium italic tracking-wide text-zinc-500 dark:text-zinc-400",
          className,
          labelClassName,
        )}
      >
        {children}
      </span>
    );
  }

  if (variant === "pin") {
    return (
      <div
        style={style}
        className={cx(
          "pin-dot relative inline-flex rotate-[var(--tilt)] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
          className,
          labelClassName,
        )}
      >
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          {children}
        </span>
      </div>
    );
  }

  return (
    <div
      style={style}
      className={cx(
        "tape relative inline-flex rotate-[var(--tilt)] items-center gap-1.5 rounded-lg border border-zinc-200 bg-paper-50/90 px-3 py-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className,
        labelClassName,
      )}
    >
      <span className="text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-300">
        {children}
      </span>
    </div>
  );
}