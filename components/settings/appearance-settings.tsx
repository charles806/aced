"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme, type ThemeMode } from "@/components/useTheme";

type AppearanceOption = {
  value: ThemeMode;
  label: string;
  description: string;
  icon: LucideIcon;
};

const OPTIONS: AppearanceOption[] = [
  {
    value: "light",
    label: "Light",
    description: "Use the light theme.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Use the dark theme.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your device setting.",
    icon: Monitor,
  },
];

export function AppearanceSettings() {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {OPTIONS.map((option) => {
        const selected = mode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setMode(option.value)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                selected
                  ? "bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <option.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm font-medium ${
                  selected
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                {option.description}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 transition ${
                selected
                  ? "border-accent-500 bg-accent-500"
                  : "border-zinc-300 dark:border-zinc-600"
              }`}
              style={selected ? { boxShadow: "inset 0 0 0 2px #fff" } : undefined}
            />
          </button>
        );
      })}
    </div>
  );
}