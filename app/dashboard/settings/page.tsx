"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { UpgradeCard } from "@/components/billing/upgrade-card";
import { useSettingsData } from "@/components/settings/use-settings-data";
import { ProfileForm } from "@/components/settings/profile-form";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { AccountSection } from "@/components/settings/account-section";
import { DangerZone } from "@/components/settings/danger-zone";

const SKELETON_CLASSES =
  "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20">
      <div className="mb-3">
        <h2
          id={id}
          className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((block) => (
        <div key={block}>
          <div className="mb-3 h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className={`${SKELETON_CLASSES} h-40 animate-pulse`} />
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const handleUnauthorized = () => router.replace("/signin");

  const { status, errorMessage, user, settings, reload } = useSettingsData({
    onUnauthorized: handleUnauthorized,
  });

  const [editedName, setEditedName] = useState<string | null>(null);

  const serverName =
    status === "ready" && user
      ? typeof user.metadata.name === "string" && user.metadata.name.trim()
        ? user.metadata.name
        : null
      : null;

  const name = editedName ?? serverName ?? "Student";

  useEffect(() => {
    if (!serverName) return;

    try {
      window.localStorage.setItem("sv-name", serverName);
    } catch {
      // localStorage unavailable — the shell keeps its fallback for now.
    }
  }, [serverName]);

  const handleNameUpdated = (next: string) => {
    setEditedName(next);
    try {
      window.localStorage.setItem("sv-name", next);
    } catch {
      // ignore
    }
  };

  const sections =
    status === "ready" && user ? (
      <>
        <SettingsSection
          id="profile"
          title="Profile"
          description="Your name, email, and account details."
        >
          <ProfileForm
            user={user}
            onNameUpdated={handleNameUpdated}
            onUnauthorized={handleUnauthorized}
          />
        </SettingsSection>

        <SettingsSection id="appearance" title="Appearance">
          <AppearanceSettings />
        </SettingsSection>

        {settings ? (
          <SettingsSection
            id="notifications"
            title="Notifications"
            description="Choose which updates you want to receive."
          >
            <NotificationSettings
              settings={settings}
              onUnauthorized={handleUnauthorized}
            />
          </SettingsSection>
        ) : null}

        <SettingsSection
          id="account"
          title="Account"
          description="Security and sign-out controls."
        >
          <AccountSection user={user} onUnauthorized={handleUnauthorized} />
        </SettingsSection>

        <SettingsSection
          id="subscription"
          title="Subscription"
          description="Your ACED plan and billing details."
        >
          <UpgradeCard onSignIn={() => router.replace("/signin")} />
        </SettingsSection>

        <SettingsSection
          id="danger-zone"
          title="Danger Zone"
          description="Actions that affect your account permanently."
        >
          <DangerZone name={name} />
        </SettingsSection>
      </>
    ) : null;

  return (
    <DashboardShell name={name}>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Settings
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your profile, preferences, and account.
          </p>
        </div>

        {status === "loading" ? <SettingsSkeleton /> : null}

        {status === "error" ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load your settings"
            description={
              errorMessage ??
              "We couldn't load your settings right now. Please try again."
            }
            cta={{ label: "Try again", onClick: () => void reload() }}
          />
        ) : null}

        {sections}
      </div>
    </DashboardShell>
  );
}