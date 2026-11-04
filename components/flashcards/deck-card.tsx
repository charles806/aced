import { MoreHorizontal, Trash2 } from "lucide-react";

type DeckCardProps = {
  deck: {
    id: string;
    title: string;
    difficulty: string | null;
    sourceNoteId: string | null;
    cardCount: number;
  };
  onOpenStudy: () => void;
  onDelete: (title: string) => void;
  deleting: boolean;
};

const difficultyChipClasses = (difficulty: string | null) => {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  switch (difficulty) {
    case "easy":
      return `${base} border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-300`;
    case "medium":
      return `${base} border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300`;
    case "hard":
      return `${base} border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/30 dark:bg-rose-900/20 dark:text-rose-300`;
    default:
      return `${base} border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`;
  }
};

export function DeckCard({
  deck,
  onOpenStudy,
  onDelete,
  deleting,
}: DeckCardProps) {
  return (
    <section
      className="relative paper-grain rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3
          className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50"
          title={deck.title}
        >
          {deck.title}
        </h3>
        <button
          type="button"
          onClick={onOpenStudy}
          aria-label={`Study ${deck.title}`}
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={difficultyChipClasses(deck.difficulty)}>
          {deck.difficulty ?? "Mixed"}
        </span>
        <span className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
        <button
          type="button"
          onClick={onOpenStudy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={deleting}
        >
          Study
        </button>
        <button
          type="button"
          onClick={() => onDelete(deck.title)}
          disabled={deleting}
          aria-label={`Delete ${deck.title}`}
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
