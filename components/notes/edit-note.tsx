"use client";

import { useState, type FormEvent } from "react";
import { Loader2, BookOpen } from "lucide-react";
import { Dialog } from "@/components/dashboard/dialog";
import { apiRequest } from "@/app/lib/api-client";
import type { Subject } from "@/components/dashboard/use-subjects";
import {
  withSubjectNames,
  type Note,
  type NoteWithSubjectName,
} from "@/components/dashboard/use-notes";

const TITLE_MAX_LENGTH = 200;

const inputClasses =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-accent-400 dark:focus:ring-accent-500/20";

const selectClasses =
  "w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-accent-400 dark:focus:ring-accent-500/20";

const labelClasses =
  "mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200";

const fieldErrorClasses = "mt-1.5 text-xs text-red-600 dark:text-red-400";

const bannerClasses =
  "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300";

const secondaryButtonClasses =
  "inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

type EditNoteProps = {
  open: boolean;
  note: NoteWithSubjectName | null;
  subjects: Subject[];
  onClose: () => void;
  onUpdated: (note: NoteWithSubjectName) => void;
  onNotFound: (noteId: string) => void;
};

export function EditNote({
  open,
  note,
  subjects,
  onClose,
  onUpdated,
  onNotFound,
}: EditNoteProps) {
  const [title, setTitle] = useState(() => note?.title ?? "");
  const [subjectId, setSubjectId] = useState(() => note?.subjectId ?? "");
  const [errors, setErrors] = useState<{ title?: string; subject?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateTitle = (value: string): string | undefined => {
    if (value.trim() === "") return "Please enter a note title.";
    if (value.length > TITLE_MAX_LENGTH) {
      return `Note titles must be ${TITLE_MAX_LENGTH} characters or fewer.`;
    }
    return undefined;
  };

  const validateSubject = (value: string): string | undefined => {
    if (!value) return "Please select a subject.";
    return undefined;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!note) return;

    const nextTitle = title.trim();
    const nextErrors = {
      title: validateTitle(nextTitle),
      subject: validateSubject(subjectId),
    };

    setErrors(nextErrors);

    if (nextErrors.title || nextErrors.subject) return;

    setSubmitting(true);
    setServerError(null);

    const result = await apiRequest<{ note: Note }>(
      `/api/notes/${note.id}`,
      {
        method: "PATCH",
        json: { title: nextTitle, subjectId },
        notFoundMessage: "That note no longer exists.",
      }
    );

    if (!result.ok) {
      const { failure } = result;

      if (failure.kind === "not-found") {
        onNotFound(note.id);
        setSubmitting(false);
        return;
      }

      setServerError(failure.message);
      setSubmitting(false);
      return;
    }

    const saved = result.data?.note;

    if (!saved || typeof saved.id !== "string") {
      setServerError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    const enriched = withSubjectNames([saved], subjects)[0];
    onUpdated(enriched);
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Edit note"
      description={
        note ? `Update the title and subject for “${note.title}”.` : undefined
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <div role="alert" className={`mb-4 ${bannerClasses}`}>
            {serverError}
          </div>
        ) : null}

        <div>
          <label htmlFor="edit-note-title" className={labelClasses}>
            Title
          </label>
          <input
            id="edit-note-title"
            type="text"
            autoComplete="off"
            maxLength={TITLE_MAX_LENGTH + 20}
            placeholder="e.g. Integration techniques"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setErrors((prev) => ({
                ...prev,
                title: validateTitle(event.target.value),
              }));
            }}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={
              errors.title ? "edit-note-title-error" : undefined
            }
            className={inputClasses}
            disabled={submitting}
            autoFocus
          />
          {errors.title ? (
            <p id="edit-note-title-error" className={fieldErrorClasses}>
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <label htmlFor="edit-note-subject" className={labelClasses}>
            Subject
          </label>
          {subjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
              <span className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <BookOpen className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                Create a subject first before adding notes.
              </span>
            </div>
          ) : (
            <div className="relative">
              <select
                id="edit-note-subject"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    subject: validateSubject(event.target.value),
                  }));
                }}
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={
                  errors.subject ? "edit-note-subject-error" : undefined
                }
                className={selectClasses}
                disabled={submitting}
              >
                {subjects.map((subject: Subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
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
          )}
          {errors.subject && subjects.length > 0 ? (
            <p id="edit-note-subject-error" className={fieldErrorClasses}>
              {errors.subject}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={secondaryButtonClasses}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || subjects.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}