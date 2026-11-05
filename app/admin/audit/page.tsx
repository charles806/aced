export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-playfair text-3xl font-semibold">Audit Logs</h1>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Audit logging table not yet created. Required fields: administrator ID, action, target resource, timestamp, non-sensitive metadata.
        </p>
        <p className="mt-3 text-xs text-amber-600">Action: add Prisma model AdminAuditLog and log sensitive admin actions server-side. Do not log secrets.</p>
      </div>
    </div>
  );
}
