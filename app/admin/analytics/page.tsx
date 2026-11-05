export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-playfair text-3xl font-semibold">Analytics</h1>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-sm text-zinc-600 dark:text-zinc-400">
        Feature usage charts require reliable tracking data. Current schema has Activity, StudySession, AIConversation logs. Build aggregated views once instrumentation is confirmed.
      </div>
    </div>
  );
}
