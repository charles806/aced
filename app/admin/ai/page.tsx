export default function AiMonitoringPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-playfair text-3xl font-semibold">AI Monitoring</h1>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          AI provider instrumentation is not yet persisted to a metrics store. 
          The app uses primary/fallback providers configured via environment variables:
        </p>
        <ul className="mt-4 text-sm list-disc pl-5 space-y-1 text-zinc-700 dark:text-zinc-300">
          <li>Providers: nim, brewkeg</li>
          <li>Features: tutor, summary, flashcards, quiz</li>
          <li>Fallback logic exists in <code>app/lib/ai/ai.ts</code></li>
        </ul>
        <p className="mt-4 text-sm text-amber-600">Instrumentation gap: request counts, failures, token usage and costs are not tracked. Add logging/metrics pipeline before displaying dashboards.</p>
      </div>
    </div>
  );
}
