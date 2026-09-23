"use client";

import { Search, X } from "lucide-react";
import type { Subject } from "@/components/dashboard/use-subjects";
import type { NoteFilters } from "@/components/dashboard/use-notes";

const searchInputClasses =
  "w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-accent-400 dark:focus:ring-accent-500/20";

const selectClasses =
  "w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-accent-400 dark:focus:ring-accent-500/20 sm:w-auto";

const clearButtonClasses =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

const chevronClasses =
  "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500";

const FILE_TYPE_OPTIONS = [
  { value: "application/pdf", label: "PDF" },
  { value: "image/*", label: "Image" },
] as const;

type NotesFiltersProps = {
  filters: NoteFilters;
  subjects: Subject[];
  onChange: (next: NoteFilters) => void;
  onClear: () => void;
};

export function NotesFilters({
  filters,
  subjects,
  onChange,
  onClear,
}: NotesFiltersProps) {
  const hasActiveFilters = Boolean(
    filters.search?.trim() || filters.subjectId || filters.fileType
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs sm:flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
          <Search className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </span>
        <input
          type="text"
          autoComplete="off"
          placeholder="Search notes…"
          aria-label="Search notes by title"
          value={filters.search ?? ""}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          className={searchInputClasses}
        />
        {filters.search ? (
          <button
            type="button"
            onClick={() => onChange({ ...filters, search: "" })}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <select
            aria-label="Filter by subject"
            value={filters.subjectId ?? ""}
            onChange={(event) =>
              onChange({ ...filters, subjectId: event.target.value })
            }
            className={selectClasses}
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <span className={chevronClasses}>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </span>
        </div>

        <div className="relative">
          <select
            aria-label="Filter by file type"
            value={filters.fileType ?? ""}
            onChange={(event) =>
              onChange({ ...filters, fileType: event.target.value })
            }
            className={selectClasses}
          >
            <option value="">All file types</option>
            {FILE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className={chevronClasses}>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </span>
        </div>

        {hasActiveFilters ? (
          <button type="button" onClick={onClear} className={clearButtonClasses}>
            <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}