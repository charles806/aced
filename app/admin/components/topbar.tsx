import Link from "next/link";

export function Topbar({ userId }: { userId: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="text-sm text-zinc-500">Admin Dashboard</div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-500">{userId.slice(0, 8)}</span>
          <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            App
          </Link>
        </div>
      </div>
    </header>
  );
}
