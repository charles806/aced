"use client";

import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

export function TutorText({ text }: { text: string }) {
  return (
    <div className="prose prose-zinc max-w-none dark:prose-invert">
      <MarkdownRenderer>{text}</MarkdownRenderer>
    </div>
  );
}