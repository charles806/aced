import Link from "next/link";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const navItems = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/ai", label: "AI Monitoring" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/health", label: "System Health" },
  { href: "/admin/audit", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ userId, children }: { userId: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Sidebar items={navItems} />
      <div className="relative flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar userId={userId} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
