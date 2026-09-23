"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";
import type { Subject } from "@/components/dashboard/use-subjects";

export type Note = {
  id: string;
  title: string;
  content: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileType: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  subjectId: string;
  /** Only present when the API generated one (list/single GET). */
  signedUrl?: string | null;
};

export type NoteWithSubjectName = Note & { subjectName: string };

export type NotesState =
  | { status: "loading" }
  | { status: "error"; message: string; unauthorized: boolean }
  | { status: "ready"; notes: Note[] };

const LOAD_NOT_FOUND_FALLBACK = "Your notes could not be found.";

type NotesPayload = { notes: Note[] };

export function useNotes() {
  const [state, setState] = useState<NotesState>({ status: "loading" });

  const fetchNotes = useCallback(async (): Promise<ApiResult<NotesPayload>> => {
    return apiRequest<NotesPayload>("/api/notes", {
      notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
    });
  }, []);

  const applyResult = useCallback((result: ApiResult<NotesPayload>) => {
    if (!result.ok) {
      setState({
        status: "error",
        message: result.failure.message,
        unauthorized: result.failure.kind === "unauthorized",
      });
      return;
    }

    const notes = Array.isArray(result.data?.notes) ? result.data.notes : [];
    setState({ status: "ready", notes });
  }, []);

  useEffect(() => {
    let ignore = false;

    void fetchNotes().then((result) => {
      if (!ignore) applyResult(result);
    });

    return () => {
      ignore = true;
    };
  }, [fetchNotes, applyResult]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void fetchNotes().then(applyResult);
  }, [fetchNotes, applyResult]);

  const setNotes = useCallback(
    (update: (previous: Note[]) => Note[]) => {
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", notes: update(current.notes) }
          : current
      );
    },
    []
  );

  return { state, reload, setNotes };
}

export function withSubjectNames(
  notes: Note[],
  subjects: Subject[]
): NoteWithSubjectName[] {
  const nameById = new Map(subjects.map((subject) => [subject.id, subject.name]));

  return notes.map((note) => ({
    ...note,
    subjectName: nameById.get(note.subjectId) ?? "Subject",
  }));
}