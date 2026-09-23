"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BookOpen, Loader2, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Dialog } from "@/components/dashboard/dialog";
import {
  SubjectCard,
  SubjectCardSkeleton,
} from "@/components/dashboard/subject-card";
import { apiRequest } from "@/app/lib/api-client";
import { useSubjects, type Subject } from "@/components/dashboard/use-subjects";

type ActiveDialog =
  | { kind: "create" }
  | { kind: "edit"; subject: Subject }
  | { kind: "delete"; subject: Subject };

const NAME_MAX_LENGTH = 100;

const inputClasses =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-accent-400 dark:focus:ring-accent-500/20";

const labelClasses =
  "mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200";


const bannerClasses =
  "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300";

const secondaryButtonClasses =
  "inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

export default function SubjectsPage() {
  const router = useRouter();
  const [name, setName] = useState("Student");
  const { state, reload, setSubjects } = useSubjects();

  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    const frame = window.requestAnimationFrame(() => {
      if (stored) setName(stored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const closeDialog = () => {
    setDialog(null);
    setPendingName("");
    setFormError(null);
    setDeleteError(null);
  };

  const openCreate = () => {
    setSectionError(null);
    setPendingName("");
    setFormError(null);
    setDialog({ kind: "create" });
  };

  const openEdit = (subject: Subject) => {
    setSectionError(null);
    setPendingName(subject.name);
    setFormError(null);
    setDialog({ kind: "edit", subject });
  };

  const openDelete = (subject: Subject) => {
    setSectionError(null);
    setDeleteError(null);
    setDialog({ kind: "delete", subject });
  };

  const validateClientSide = (value: string): string | null => {
    if (value === "") return "Please enter a subject name.";
    if (value.length > NAME_MAX_LENGTH) {
      return `Subject names must be ${NAME_MAX_LENGTH} characters or fewer.`;
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = pendingName.trim();
    const clientError = validateClientSide(trimmed);

    if (clientError) {
      setFormError(clientError);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const isCreate = dialog?.kind === "create";
    const subjectId = dialog?.kind === "edit" ? dialog.subject.id : undefined;

    const result = await apiRequest<{ subject: Subject }>(
      isCreate ? "/api/subject" : `/api/subject/${subjectId}`,
      {
        method: isCreate ? "POST" : "PATCH",
        json: { name: trimmed },
        notFoundMessage: "That subject no longer exists.",
      }
    );

    if (!result.ok) {
      const { failure } = result;

      if (
        !isCreate &&
        failure.kind === "not-found" &&
        typeof subjectId === "string"
      ) {
        setSubjects((previous) =>
          previous.filter((item) => item.id !== subjectId)
        );
        closeDialog();
        setSectionError("That subject no longer exists.");
      } else {
        setFormError(failure.message);
      }

      setSubmitting(false);
      return;
    }

    const saved = result.data.subject;

    if (!saved || typeof saved.id !== "string") {
      // Unexpected payload shape — refresh rather than corrupting local state.
      closeDialog();
      void reload();
      setSubmitting(false);
      return;
    }

    if (isCreate) {
      setSubjects((previous) => [saved, ...previous]);
    } else {
      setSubjects((previous) =>
        previous.map((item) => (item.id === saved.id ? saved : item))
      );
    }

    setSubmitting(false);
    closeDialog();
  };

  const handleConfirmDelete = async () => {
    if (dialog?.kind !== "delete") return;

    const subject = dialog.subject;

    setDeletingId(subject.id);
    setDeleteError(null);

    const result = await apiRequest<{ message: string }>(
      `/api/subject/${subject.id}`,
      {
        method: "DELETE",
        notFoundMessage: "That subject no longer exists.",
      }
    );

    if (!result.ok) {
      const { failure } = result;

      if (failure.kind === "not-found") {
        // Already gone — treat as success and quietly drop the stale card.
        setSubjects((previous) =>
          previous.filter((item) => item.id !== subject.id)
        );
        setDeletingId(null);
        closeDialog();
        return;
      }

      setDeleteError(failure.message);
      setDeletingId(null);
      return;
    }

    setSubjects((previous) =>
      previous.filter((item) => item.id !== subject.id)
    );

    setDeletingId(null);
    closeDialog();
  };

  const renderContent = () => {
    if (state.status === "loading") {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <SubjectCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (state.status === "error") {
      return (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load your subjects"
          description={state.message}
          cta={{
            label: state.unauthorized ? "Sign in again" : "Try again",
            onClick: () => {
              if (state.unauthorized) {
                router.push("/signin");
                return;
              }
              void reload();
            },
          }}
        />
      );
    }

    if (state.subjects.length === 0) {
      return (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Add your first subject to start tracking progress across your studies."
          cta={{ label: "Add a subject", onClick: openCreate }}
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onEdit={openEdit}
            onDelete={openDelete}
            deleting={deletingId === subject.id}
          />
        ))}
      </div>
    );
  };

  return (
    <DashboardShell name={name}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Your subjects
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Organize your studies one subject at a time.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={state.status === "loading"}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-accent-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New subject
        </button>
      </div>

      {sectionError ? (
        <div role="alert" className={`mt-6 ${bannerClasses}`}>
          {sectionError}
        </div>
      ) : null}

      <div className="mt-8">{renderContent()}</div>

      {/* Create / edit */}
      <Dialog
        open={dialog?.kind === "create" || dialog?.kind === "edit"}
        onClose={() => {
          if (!submitting) closeDialog();
        }}
        title={dialog?.kind === "edit" ? "Edit subject" : "New subject"}
        description={
          dialog?.kind === "edit"
            ? `Update the name of “${dialog.subject.name}”.`
            : "Give your subject a name, like Mathematics or History."
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          {formError ? (
            <div role="alert" className={`mb-4 ${bannerClasses}`}>
              {formError}
            </div>
          ) : null}

          <label htmlFor="subject-name" className={labelClasses}>
            Subject name
          </label>
          <input
            id="subject-name"
            type="text"
            // autoComplete="off"
            maxLength={NAME_MAX_LENGTH + 20}
            placeholder="e.g. Mathematics"
            value={pendingName}
            onChange={(event) => setPendingName(event.target.value)}
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? "subject-name-error" : undefined}
            className={inputClasses}
            // autoFocus
          />

          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={submitting}
              className={secondaryButtonClasses}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {dialog?.kind === "edit" ? "Saving…" : "Creating…"}
                </>
              ) : dialog?.kind === "edit" ? (
                "Save changes"
              ) : (
                "Create subject"
              )}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={dialog?.kind === "delete"}
        onClose={() => {
          if (!deletingId) closeDialog();
        }}
        title="Delete subject"
        description={
          dialog?.kind === "delete"
            ? `Delete “${dialog.subject.name}”? Any notes attached to it will be removed too. This action can't be undone.`
            : undefined
        }
      >
        {deleteError ? (
          <div role="alert" className={`mb-4 ${bannerClasses}`}>
            {deleteError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeDialog}
            disabled={Boolean(deletingId)}
            className={secondaryButtonClasses}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirmDelete()}
            disabled={Boolean(deletingId)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-600/30 transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingId ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              "Delete subject"
            )}
          </button>
        </div>
      </Dialog>
    </DashboardShell>
  );
}
