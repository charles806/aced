import { FileText } from "lucide-react";
import type { MockNote } from "@/app/dashboard/mock-data";

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysAgo = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );

  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return `${daysAgo} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NoteItem({ note }: { note: MockNote }) {
  return (
    <li className="group flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-400 transition group-hover:text-accent-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
        <FileText className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {note.title}
        </p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{note.fileName}</p>
      </div>
      <span className="shrink-0 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
        {note.subjectName}
      </span>
      <time
        dateTime={note.createdAt}
        className="w-20 shrink-0 text-right text-xs text-zinc-400 dark:text-zinc-500"
      >
        {formatRelativeDate(note.createdAt)}
      </time>
    </li>
  );
}
