"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  FileText,
  AlertCircle,
  Loader2,
  Upload,
  X,
  BookOpen,
} from "lucide-react";
import { Dialog } from "@/components/dashboard/dialog";
import {
  useSubjects,
  type Subject,
} from "@/components/dashboard/use-subjects";

export type Note = {
  id: string;
  title: string;
  content?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  subjectId: string;
};

export type NoteWithSubjectName = Note & { subjectName: string };

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

type CreateNoteProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (note: NoteWithSubjectName) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CreateNote({ open, onClose, onCreated }: CreateNoteProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { state: subjectsState, reload: reloadSubjects } = useSubjects();

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<{
    title?: string;
    subject?: string;
    file?: string;
  }>({});
  const [touched, setTouched] = useState<{
    title: boolean;
    subject: boolean;
    file: boolean;
  }>({ title: false, subject: false, file: false });

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setSubjectId("");
    setFile(null);
    setErrors({});
    setTouched({ title: false, subject: false, file: false });
    setServerError(null);
  }, [open]);

  const subjects =
    subjectsState.status === "ready" ? subjectsState.subjects : [];
  const subjectsLoading = subjectsState.status === "loading";
  const subjectsErrorMsg =
    subjectsState.status === "error" ? subjectsState.message : null;

  const validateTitle = (value: string): string | undefined => {
    if (value.trim() === "") return "Please enter a note title.";
    return undefined;
  };

  const validateSubject = (value: string): string | undefined => {
    if (!value) return "Please select a subject.";
    return undefined;
  };

  const validateFile = (value: File | null): string | undefined => {
    if (!value) return "Please select a PDF or image file.";
    return undefined;
  };

  const validateAll = (): boolean => {
    const next = {
      title: validateTitle(title),
      subject: validateSubject(subjectId),
      file: validateFile(file),
    };
    setErrors(next);
    setTouched({ title: true, subject: true, file: true });
    return !next.title && !next.subject && !next.file;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateAll()) return;

    setSubmitting(true);
    setServerError(null);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("subjectId", subjectId);
    formData.append("file", file!);

    let response: Response;

    try {
      response = await fetch("/api/notes", {
        method: "POST",
        body: formData,
      });
    } catch {
      setServerError(
        "We couldn't upload your note. Please check your connection and try again."
      );
      setSubmitting(false);
      return;
    }

    if (!response.ok) {
      let message = "Something went wrong. Please try again.";

      try {
        const payload = await response.json();
        if (payload && typeof payload === "object" && "error" in payload) {
          const err = (payload as { error: unknown }).error;
          if (typeof err === "string" && err.length > 0) message = err;
        }
      } catch {
        // Response wasn't JSON — keep the default message.
      }

      setServerError(message);
      setSubmitting(false);
      return;
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      setServerError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      !("note" in payload) ||
      typeof (payload as Record<string, unknown>).note !== "object"
    ) {
      void reloadSubjects();
      setSubmitting(false);
      return;
    }

    const note = (payload as { note: Note }).note;
    const subject = subjects.find((s) => s.id === subjectId);
    const subjectName = subject?.name ?? "Subject";

    onCreated({ ...note, subjectName });
    setSubmitting(false);
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) return;

    const isPdf = selected.type === "application/pdf";
    const isImage = selected.type.startsWith("image/");

    if (!isPdf && !isImage) {
      setErrors((prev) => ({
        ...prev,
        file: "Only PDF and image files are supported.",
      }));
      setTouched((prev) => ({ ...prev, file: true }));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        file: "File must be 10MB or smaller.",
      }));
      setTouched((prev) => ({ ...prev, file: true }));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selected);
    setErrors((prev) => ({ ...prev, file: undefined }));
    setTouched((prev) => ({ ...prev, file: true }));
  };

  const removeFile = () => {
    setFile(null);
    setErrors((prev) => ({ ...prev, file: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileIsImage = file?.type.startsWith("image/") ?? false;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Create note"
      description="Upload a study note to keep it organized with your subjects."
    >
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <div role="alert" className={`mb-4 ${bannerClasses}`}>
            {serverError}
          </div>
        ) : null}

        {/* Title */}
        <div>
          <label htmlFor="note-title" className={labelClasses}>
            Title
          </label>
          <input
            id="note-title"
            type="text"
            autoComplete="off"
            placeholder="e.g. Integration techniques"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (touched.title) {
                setErrors((prev) => ({
                  ...prev,
                  title: validateTitle(event.target.value),
                }));
              }
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, title: true }));
              setErrors((prev) => ({ ...prev, title: validateTitle(title) }));
            }}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "note-title-error" : undefined}
            className={inputClasses}
            disabled={submitting}
            autoFocus
          />
          {errors.title ? (
            <p id="note-title-error" className={fieldErrorClasses}>
              {errors.title}
            </p>
          ) : null}
        </div>

        {/* Subject */}
        <div className="mt-4">
          <label htmlFor="note-subject" className={labelClasses}>
            Subject
          </label>
          {subjectsLoading ? (
            <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ) : subjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
              <span className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <BookOpen className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                Create a subject first before adding notes.
              </span>
            </div>
          ) : (
            <div className="relative">
              <select
                id="note-subject"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  if (touched.subject) {
                    setErrors((prev) => ({
                      ...prev,
                      subject: validateSubject(event.target.value),
                    }));
                  }
                }}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, subject: true }));
                  setErrors((prev) => ({
                    ...prev,
                    subject: validateSubject(subjectId),
                  }));
                }}
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={
                  errors.subject ? "note-subject-error" : undefined
                }
                className={selectClasses}
                disabled={submitting}
              >
                <option value="">Select subject</option>
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
          {subjectsErrorMsg && !subjectsLoading ? (
            <p className={fieldErrorClasses}>{subjectsErrorMsg}</p>
          ) : null}
          {errors.subject && !subjectsLoading && subjects.length > 0 ? (
            <p id="note-subject-error" className={fieldErrorClasses}>
              {errors.subject}
            </p>
          ) : null}
        </div>

        {/* File */}
        <div className="mt-4">
          <label className={labelClasses}>Study material</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileSelect}
            className="sr-only"
            aria-label="Upload study material"
            tabIndex={-1}
          />

          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
              {fileIsImage ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-500 dark:bg-accent-500/10 dark:text-accent-400">
                  <FileText
                    className="h-5 w-5"
                    aria-hidden="true"
                    strokeWidth={1.75}
                  />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {file.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatFileSize(file.size)}
                  {" · "}
                  {fileIsImage ? "Image" : "PDF"}
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                disabled={submitting}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:text-zinc-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:hover:text-zinc-300"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-6 py-8 text-center transition hover:border-accent-300 hover:bg-accent-50/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-accent-500/40 dark:hover:bg-accent-500/5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-500 dark:bg-accent-500/10 dark:text-accent-400">
                <Upload className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Upload PDF or image
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                PDF or image, up to 10 MB
              </span>
            </button>
          )}

          {errors.file ? (
            <p className={fieldErrorClasses}>{errors.file}</p>
          ) : null}
        </div>

        {/* Actions */}
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
                Uploading note…
              </>
            ) : (
              "Create note"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
