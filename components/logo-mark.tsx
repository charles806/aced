import { BookOpen } from "lucide-react";

export function LogoMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500 text-white shadow-sm shadow-accent-500/30">
      <BookOpen className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
    </span>
  );
}