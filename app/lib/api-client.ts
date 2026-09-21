export type ApiFailure = {
  kind:
    | "network"
    | "timeout"
    | "unauthorized"
    | "not-found"
    | "validation"
    | "server";
  message: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: ApiFailure };

const REQUEST_TIMEOUT_MS = 15000;

const NETWORK_MESSAGE =
  "We couldn't connect to ACED. Please check your connection and try again.";
const UNAUTHORIZED_MESSAGE =
  "Your session has expired. Please sign in again.";
const SERVER_MESSAGE = "Something went wrong on our end. Please try again.";

function extractErrorMessage(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as Record<string, unknown>).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return undefined;
}

export async function apiRequest<T>(
  url: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    json?: unknown;
    notFoundMessage?: string;
  } = {}
): Promise<ApiResult<T>> {
  const { method = "GET", json, notFoundMessage } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers:
        json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";

    return {
      ok: false,
      failure: {
        kind: timedOut ? "timeout" : "network",
        message: NETWORK_MESSAGE,
      },
    };
  } finally {
    clearTimeout(timer);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const serverMessage = extractErrorMessage(payload);

    if (response.status === 401) {
      return {
        ok: false,
        failure: { kind: "unauthorized", message: UNAUTHORIZED_MESSAGE },
      };
    }

    if (response.status === 404) {
      return {
        ok: false,
        failure: {
          kind: "not-found",
          message:
            notFoundMessage ?? serverMessage ?? "This item no longer exists.",
        },
      };
    }

    if (response.status === 400) {
      // Backend validation messages are curated user-facing strings.
      return {
        ok: false,
        failure: {
          kind: "validation",
          message: serverMessage ?? "Please check your input and try again.",
        },
      };
    }

    return { ok: false, failure: { kind: "server", message: SERVER_MESSAGE } };
  }

  return { ok: true, data: payload as T };
}
