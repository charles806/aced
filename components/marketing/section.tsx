import type { ReactNode } from "react";
import { cx } from "./lib/cx";

export function Section({
  id,
  className,
  containerClassName,
  children,
}: {
  id?: string;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cx("relative scroll-mt-24 py-20 sm:py-24", className)}>
      <div
        className={cx(
          "mx-auto w-full max-w-6xl px-4 sm:px-6",
          containerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}