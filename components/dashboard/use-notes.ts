"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";
import type { Subject } from "@/components/dashboard/use-subjects";
import { useDataCache, buildCacheKey } from "@/app/lib/data-cache";

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
  summary?: string | null;
  summaryStatus?: string | null;
  summaryUpdatedAt?: string | null;
  summaryLength?: string | null;
  extractionStatus?: string | null;
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
const NOTES_TTL_MS = 30_000; // 30 seconds

type CacheResult<T> = { data: T | undefined; status: "loading" | "ready" | "error"; error?: string; unauthorized?: boolean };

function toApiResult<T>(res: CacheResult<T>): ApiResult<T> {
  if (res.status === "ready" && res.data) {
    return { ok: true, data: res.data };
  }
  if (res.status === "error") {
    return { ok: false, failure: { kind: res.unauthorized ? "unauthorized" : "server", message: res.error ?? "Failed to load" } };
  }
  return { ok: false, failure: { kind: "server", message: "Loading" } };
}

function buildNotesQuery(filters: NoteFilters): string {
  const params = new URLSearchParams();

  const search = filters.search?.trim();
  if (search) params.set("search", search);

  if (filters.subjectId) params.set("subjectId", filters.subjectId);
  if (filters.fileType) params.set("fileType", filters.fileType);

  return params.toString();
}

export function useNotes(filters: NoteFilters = {}) {
  const { get, invalidate, getEntry } = useDataCache();
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

  const cacheKey = useMemo(() => {
    return buildCacheKey("/api/notes", queryString ? { q: queryString } : undefined);
  }, [queryString]);

  const fetchNotes = useCallback(async (): Promise<ApiResult<NotesPayload>> => {
    const url = queryString === "" ? "/api/notes" : `/api/notes?${queryString}`;

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

    const cached = getEntry<NotesPayload>(cacheKey);
    if (cached && cached.status === "ready") {
      const isStale = Date.now() - cached.lastFetched > NOTES_TTL_MS;
      if (!isStale) {
        applyResult({ ok: true, data: cached.data });
        // Revalidate in background
        void get(cacheKey, fetchNotes, { ttlMs: NOTES_TTL_MS, dedupe: true }).then((res) => {
          if (!ignore && res.status === "ready" && res.data) {
            applyResult({ ok: true, data: res.data });
          }
        });
        return;
      }
    }

    void get(cacheKey, fetchNotes, { ttlMs: NOTES_TTL_MS, dedupe: true }).then((res) => {
      if (!ignore) {
        applyResult(toApiResult(res));
      }
    });

    return () => {
      ignore = true;
    };
  }, [get, getEntry, cacheKey, fetchNotes, applyResult, queryString]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void get(cacheKey, fetchNotes, { ttlMs: 0, dedupe: false }).then((res) => applyResult(toApiResult(res)));
  }, [get, cacheKey, fetchNotes, applyResult]);

  const setNotes = useCallback(
    (update: (previous: Note[]) => Note[]) => {
      setState((current) =>
        current.status === "ready" && current.forQuery === queryString
          ? { ...current, notes: update(current.notes) }
          : current
      );
      // Invalidate all notes cache entries since they may have different filters
      invalidate("/api/notes");
    },
    [invalidate, queryString]
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