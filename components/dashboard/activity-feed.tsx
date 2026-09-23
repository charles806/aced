"use client";

import { BookOpen, Eye, FileText, Timer, type LucideIcon } from "lucide-react";
import { formatRelativeTime } from "@/app/lib/format";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { ActivityItem } from "@/components/dashboard/use-progress";

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  note_created: FileText,
  note_opened: Eye,
  subject_created: BookOpen,
  study_session_completed: Timer,
};

const FALLBACK_ICON: LucideIcon = FileText;

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Timer}
        title="No activity yet"
        description="Create a note, add a subject, or finish a study session and it will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((item) => {
        const Icon = ACTIVITY_ICONS[item.type] ?? FALLBACK_ICON;

        return (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
              <Icon className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-200">
              {item.label}
            </span>
            <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
              {formatRelativeTime(item.createdAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}