"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/app/lib/api-client";

export type Subject = {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type SubjectsState =
  | { status: "loading" }
  | { status: "error"; message: string; unauthorized: boolean }
  | { status: "ready"; subjects: Subject[] };

const LOAD_NOT_FOUND_FALLBACK = "Your subjects could not be found.";

export function useSubjects() {
  const [state, setState] = useState<SubjectsState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });

    const result = await apiRequest<{ subjects: Subject[] }>("/api/subject", {
      notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
    });

    if (!result.ok) {
      setState({
        status: "error",
        message: result.failure.message,
        unauthorized: result.failure.kind === "unauthorized",
      });
      return;
    }

    const subjects = Array.isArray(result.data?.subjects)
      ? result.data.subjects
      : [];

    setState({ status: "ready", subjects });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setSubjects = useCallback(
    (update: (previous: Subject[]) => Subject[]) => {
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", subjects: update(current.subjects) }
          : current
      );
    },
    []
  );

  return { state, reload: load, setSubjects };
}
