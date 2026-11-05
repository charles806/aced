import { prisma } from "@/app/lib/auth";

export default async function SystemHealthPage() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {}

  return (
    <div className="space-y-6">
      <h1 className="font-playfair text-3xl font-semibold">System Health</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <HealthCard label="Database Connectivity" status={dbOk ? "ok" : "error"} />
        <HealthCard label="Application" status="ok" />
        <HealthCard label="AI Providers" status="unknown" />
        <HealthCard label="Background Jobs" status="unknown" />
      </div>
      <p className="text-xs text-zinc-500">Only checks that can be measured reliably are shown. Add instrumentation for API error rates, storage health, etc.</p>
    </div>
  );
}

function HealthCard({ label, status }: { label: string; status: "ok" | "error" | "unknown" }) {
  const color = status === "ok" ? "text-emerald-600" : status === "error" ? "text-red-600" : "text-amber-600";
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className={`mt-2 text-lg font-medium ${color}`}>{status.toUpperCase()}</div>
    </div>
  );
}
