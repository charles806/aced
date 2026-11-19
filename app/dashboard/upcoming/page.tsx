"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  AlertCircle,
  BookOpen,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/marketing/reveal";
import { apiRequest } from "@/app/lib/api-client";
import { useRouter } from "next/navigation";

type UpcomingItem =
  | {
      id: string;
      type: "quiz_deadline";
      title: string;
      description: string;
      dueAt: string;
      quizId: string;
      attemptId: string;
    }
  | {
      id: string;
      type: "study_session";
      title: string;
      description: string;
      dueAt: string;
      subjectId: string | null;
      sessionId: string;
    };

type UpcomingResponse = {
  items: UpcomingItem[];
};

function formatDueDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMs <= 0) return "Overdue";
  if (diffDays === 0) {
    if (diffHours === 0) return "Due soon";
    return `In ${diffHours}h`;
  }
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getItemIcon(type: UpcomingItem["type"]) {
  switch (type) {
    case "quiz_deadline":
      return <BookOpen className="h-4 w-4" aria-hidden="true" />;
    case "study_session":
      return <Clock className="h-4 w-4" aria-hidden="true" />;
  }
}

function getItemColor(type: UpcomingItem["type"]) {
  switch (type) {
    case "quiz_deadline":
      return "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";
    case "study_session":
      return "text-accent-600 bg-accent-50 dark:bg-accent-500/10 dark:text-accent-400";
  }
}

function UpcomingPageContent() {
  const router = useRouter();
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcoming = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<UpcomingResponse>("/api/upcoming");
      if (!result.ok) {
        if (result.failure.kind === "unauthorized") {
          router.replace("/signin");
          return;
        }
        setError(result.failure.message);
        return;
      }
      setItems(result.data.items ?? []);
    } catch (err) {
      console.error("Failed to load upcoming:", err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, []);

  if (loading) {
    return (
      <DashboardShell name="Student">
        <Reveal direction="up">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
                Upcoming
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Your upcoming quiz deadlines and study sessions.
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal direction="up" delay={0.05}>
          <div className="mt-6 space-y-4" role="status" aria-label="Loading upcoming items">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-zinc-100 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-1/4 bg-zinc-100 dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell name="Student">
        <Reveal direction="up">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
                Upcoming
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Your upcoming quiz deadlines and study sessions.
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal direction="up" delay={0.05}>
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load upcoming"
            description={error}
            cta={{ label: "Try again", onClick: fetchUpcoming }}
          />
        </Reveal>
      </DashboardShell>
    );
  }

  const quizDeadlines = items.filter((i) => i.type === "quiz_deadline");
  const studySessions = items.filter((i) => i.type === "study_session");

  return (
    <DashboardShell name="Student">
      <Reveal direction="up">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Upcoming
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Your upcoming quiz deadlines and study sessions.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal direction="up" delay={0.05}>
        {items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing scheduled"
            description="Quiz deadlines and study sessions will appear here."
            cta={{ label: "Back to dashboard", onClick: () => router.push("/dashboard") }}
          />
        ) : (
          <div className="space-y-6">
            {quizDeadlines.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                  Quiz Deadlines ({quizDeadlines.length})
                </h2>
                <div className="space-y-2">
                  {quizDeadlines.map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/quizzes/${item.quizId}`}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-accent-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getItemColor(item.type)}`}
                      >
                        {getItemIcon(item.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {item.title}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        <span
                          className={`rounded-full px-2.5 py-0.5 ${
                            new Date(item.dueAt) < new Date()
                              ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {formatDueDate(item.dueAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {studySessions.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                  Study Sessions ({studySessions.length})
                </h2>
                <div className="space-y-2">
                  {studySessions.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getItemColor(item.type)}`}
                      >
                        {getItemIcon(item.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {item.title}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        <span
                          className={`rounded-full px-2.5 py-0.5 ${
                            new Date(item.dueAt) < new Date()
                              ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {formatDueDate(item.dueAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Reveal>
    </DashboardShell>
  );
}

export default function UpcomingPage() {
  return <UpcomingPageContent />;
}