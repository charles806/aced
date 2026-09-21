import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <Sidebar name={name} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar name={name} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
