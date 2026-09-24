"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type NotesPayload = { notes: Note[] };

export type NoteFilters = {
  search?: string;
  subjectId?: string;
  fileType?: string;
};

export function isWrittenNote(note: Note): boolean {
  return !note.fileUrl && !note.fileName && !note.fileType;
}

export function isFileNote(note: Note): boolean {
  return Boolean(note.fileUrl || note.fileName || note.fileType);
}

type NotesStateInternal =
  | { status: "loading" }
  | {
      status: "error";
      message: string;
      unauthorized: boolean;
      forQuery: string;
    }
  | { status: "ready"; notes: Note[]; forQuery: string };

const LOAD_NOT_FOUND_FALLBACK = "Your notes could not be found.";

const SEARCH_DEBOUNCE_MS = 300;

function buildNotesQuery(filters: NoteFilters): string {
  const params = new URLSearchParams();

  const search = filters.search?.trim();
  if (search) params.set("search", search);

  if (filters.subjectId) params.set("subjectId", filters.subjectId);
  if (filters.fileType) params.set("fileType", filters.fileType);

  return params.toString();
}

export function useNotes(filters: NoteFilters = {}) {
  const [internalState, setState] = useState<NotesStateInternal>({
    status: "loading",
  });
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search ?? "");
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const queryString = useMemo(() => {
    return buildNotesQuery({
      search: debouncedSearch,
      subjectId: filters.subjectId,
      fileType: filters.fileType,
    });
  }, [debouncedSearch, filters.subjectId, filters.fileType]);

  const fetchNotes = useCallback(async (): Promise<ApiResult<NotesPayload>> => {
    const url =
      queryString === "" ? "/api/notes" : `/api/notes?${queryString}`;

    return apiRequest<NotesPayload>(url, {
      notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
    });
  }, [queryString]);

  const applyResult = useCallback(
    (result: ApiResult<NotesPayload>) => {
      if (!result.ok) {
        setState({
          status: "error",
          message: result.failure.message,
          unauthorized: result.failure.kind === "unauthorized",
          forQuery: queryString,
        });
        return;
      }

      const notes = Array.isArray(result.data?.notes) ? result.data.notes : [];
      setState({ status: "ready", notes, forQuery: queryString });
    },
    [queryString]
  );

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
        current.status === "ready" && current.forQuery === queryString
          ? { ...current, notes: update(current.notes) }
          : current
      );
    },
    [queryString]
  );

  const state = useMemo<NotesState>(() => {
    if (internalState.status !== "loading" && internalState.forQuery !== queryString) {
      return { status: "loading" };
    }
    return internalState;
  }, [internalState, queryString]);

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