import { Moon, Sun } from "lucide-react";

export function ThemeToggle({
  dark,
  onToggle,
}: {
  dark: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300/70 bg-white/70 text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-zinc-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      {dark ? (
        <Moon className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={2} />
      ) : (
        <Sun className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={2} />
      )}
    </button>
  );
}