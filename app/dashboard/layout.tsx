"use client";

import { useSubjects } from "@/components/dashboard/use-subjects";
import { StudyTimerProvider } from "@/app/lib/study-timer-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { state: subjectsState } = useSubjects();
  const subjects = subjectsState.status === "ready" ? subjectsState.subjects : [];

  return (
    <StudyTimerProvider subjects={subjects}>
      {children}
    </StudyTimerProvider>
  );
}
