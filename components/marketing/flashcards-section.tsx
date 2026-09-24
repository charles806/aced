"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, FlipVertical } from "lucide-react";
import Link from "next/link";
import { Annotation } from "./annotation";
import { PaperCard } from "./paper-card";
import { Reveal } from "./reveal";
import { Section } from "./section";

export function FlashcardsSection() {
  const [flipped, setFlipped] = useState(false);

  return (
    <Section id="flashcards" className="pb-4">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal className="lg:order-2">
          <div className="relative">
            <Annotation
              variant="tape"
              tilt={-2}
              className="absolute -top-6 right-8 z-10"
            >
              front → back
            </Annotation>
            <div className="paper-grain rounded-2xl border border-zinc-200 bg-paper-100 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <PaperCard className="overflow-hidden">
                <Image
                  src="/previews/flashcards.svg"
                  alt="AI-generated flashcards preview showing the question and answer side of a biology card"
                  width={1200}
                  height={780}
                  className="h-auto w-full"
                />
              </PaperCard>
            </div>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.06} className="lg:order-1">
          <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            Flashcards
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Practice with flashcards made from your own notes
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            ACED turns what you&apos;ve uploaded into question-and-answer
            cards. Flip, mark what you know, and let the ones you struggle
            with come back around.
          </p>

          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            aria-pressed={flipped}
            className="group mt-7 flex w-full max-w-sm items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative h-24 w-16 shrink-0 [perspective:600px]">
              <div
                className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
                style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-zinc-200 bg-accent-50 text-center text-[10px] font-semibold text-accent-700 [backface-visibility:hidden] dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-300">
                  Q
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-center text-[10px] font-semibold text-violet-700 [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                  A
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Question → Answer
              </p>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Flip to check yourself
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent-600 dark:text-accent-400">
                <FlipVertical className="h-3.5 w-3.5" aria-hidden="true" />
                tap to flip
              </span>
            </div>
          </button>

          <Link
            href="/signup"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent-600 transition hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            Make your first flashcard
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </Section>
  );
}