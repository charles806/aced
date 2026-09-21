import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

const SAMPLE_PROMPTS = [
  "Explain this simply",
  "Create a quiz",
  "Summarize my notes",
  "What should I study next?",
];

export function AITutorCard() {
  const router = useRouter();

  // TODO(dashboard): wire sample prompts to the real AI Tutor conversation
  // once the AI backend exists. Until then they are visual/sample only.
  const handlePrompt = () => router.push("/dashboard/ai-tutor");
  const handleOpen = () => router.push("/dashboard/ai-tutor");

  return (
    <section
      aria-labelledby="ai-tutor-title"
      className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
          <Sparkles className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
        </span>
        <div>
          <h2 id="ai-tutor-title" className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            AI Tutor
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Powered by your study materials</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        Ask ACED anything about your notes and subjects — get simple explanations, practice
        quizzes, and a plan for what to study next.
      </p>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Sample questions">
        {SAMPLE_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={handlePrompt}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-accent-500/50 dark:hover:bg-accent-500/10 dark:hover:text-accent-300"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 transition hover:text-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 focus-visible:rounded dark:text-accent-400 dark:hover:text-accent-300"
        >
          Open AI Tutor
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
