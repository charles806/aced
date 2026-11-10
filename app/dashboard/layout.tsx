"use client";

import { useSubjects } from "@/components/dashboard/use-subjects";
import { StudyTimerProvider } from "@/app/lib/study-timer-context";
import { DataCacheProvider, useCacheClearOnAuthChange } from "@/app/lib/data-cache";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { state: subjectsState } = useSubjects();
  const subjects = subjectsState.status === "ready" ? subjectsState.subjects : [];

  return (
    <StudyTimerProvider subjects={subjects}>
      {children}
    </StudyTimerProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Clear cache on logout/user switch
  useCacheClearOnAuthChange();

  return (
    <DataCacheProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </DataCacheProvider>
  );
}
