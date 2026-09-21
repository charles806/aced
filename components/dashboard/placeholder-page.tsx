"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "./shell";
import { EmptyState } from "./empty-state";

export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  ctaLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
}) {
  const [name, setName] = useState("Student");
  const router = useRouter();

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    const frame = window.requestAnimationFrame(() => {
      if (stored) setName(stored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <DashboardShell name={name}>
      <div className="mx-auto max-w-2xl">
        <h1 className="sr-only">{title}</h1>
        <EmptyState
          icon={Icon}
          title={title}
          description={description}
          cta={
            ctaLabel
              ? {
                  label: ctaLabel,
                  onClick: () => {
                    // TODO(dashboard): point this at the real feature page
                    // once subjects/notes/upcoming are implemented.
                    router.push("/dashboard");
                  },
                }
              : undefined
          }
        />
      </div>
    </DashboardShell>
  );
}
