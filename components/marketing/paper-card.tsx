import type { ReactNode } from "react";
import { cx } from "./lib/cx";

export function PaperCard({
  children,
  className,
  tilt = 0,
  interactive = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  tilt?: number;
  interactive?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-12px_rgba(24,24,27,0.12)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]",
        interactive &&
          "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(24,24,27,0.05),0_16px_32px_-12px_rgba(24,24,27,0.16)] dark:hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.7)]",
        className,
      )}
      style={
        tilt
          ? { ...style, transform: `rotate(${tilt}deg)` }
          : style
      }
    >
      {children}
    </div>
  );
}