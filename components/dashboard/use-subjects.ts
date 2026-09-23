"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";

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

type SubjectsPayload = { subjects: Subject[] };

export function useSubjects() {
  const [state, setState] = useState<SubjectsState>({ status: "loading" });

  const fetchSubjects = useCallback(async (): Promise<
    ApiResult<SubjectsPayload>
  > => {
    return apiRequest<SubjectsPayload>("/api/subject", {
      notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
    });
  }, []);

  const applyResult = useCallback(
    (result: ApiResult<SubjectsPayload>) => {
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
    },
    []
  );

  useEffect(() => {
    let ignore = false;

    void fetchSubjects().then((result) => {
      if (!ignore) applyResult(result);
    });

    return () => {
      ignore = true;
    };
  }, [fetchSubjects, applyResult]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void fetchSubjects().then(applyResult);
  }, [fetchSubjects, applyResult]);

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

  return { state, reload, setSubjects };
}