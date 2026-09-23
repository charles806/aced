"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { UpgradeCard } from "@/components/billing/upgrade-card";

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("Student");

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    const frame = window.requestAnimationFrame(() => {
      if (stored) setName(stored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <DashboardShell name={name}>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Settings
        </h1>

        <div className="mt-6">
          <UpgradeCard onSignIn={() => router.push("/signin")} />
        </div>

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          Account and study preferences are coming soon.
        </p>
      </div>
    </DashboardShell>
  );
}