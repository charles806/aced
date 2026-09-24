import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({ icon: Icon, title, description, cta }: EmptyStateProps) {
  return (
    <div className="relative paper-grain flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <span
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-500 transition-transform duration-300 hover:rotate-6 hover:scale-105 dark:bg-accent-500/10 dark:text-accent-400"
      >
        <Icon
          className="absolute inset-0 m-auto h-6 w-6 animate-float dark:animate-none"
          style={{ ["--tilt" as string]: "0deg" }}
          aria-hidden="true"
          strokeWidth={1.75}
        />
      </span>
      <h3 className="relative mt-5 font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      <p className="relative mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      {cta ? (
        <button
          type="button"
          onClick={cta.onClick}
          className="relative mt-6 inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-md hover:shadow-accent-500/30 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
        >
          {cta.label}
        </button>
      ) : null}
    </div>
  );
}
