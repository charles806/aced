import Image from "next/image";
import { ArrowRight, CheckCircle2, ListOrdered } from "lucide-react";
import Link from "next/link";
import { Annotation } from "./annotation";
import { PaperCard } from "./paper-card";
import { Reveal } from "./reveal";
import { Section } from "./section";

export function QuizzesSection() {
  return (
    <Section id="quizzes" className="pb-4">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal direction="right">
          <div className="relative">
            <Annotation
              variant="pin"
              tilt={1.5}
              className="absolute -top-7 right-8 z-10"
            >
              check yourself ✍
            </Annotation>
            <div className="paper-grain rounded-2xl border border-zinc-200 bg-paper-100 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <PaperCard className="overflow-hidden">
                <Image
                  src="/previews/quizzes.svg"
                  alt="AI-generated quiz preview with a multiple choice question, progress bar and live score"
                  width={1200}
                  height={780}
                  className="h-auto w-full"
                />
              </PaperCard>
            </div>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.06}>
          <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            Quizzes
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Test yourself before the real thing
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Turn your notes into multiple choice quizzes and see how much
            actually stuck. Instant feedback, a clear score, and another
            round whenever you&apos;re ready.
          </p>

          <div className="mt-7 space-y-4">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-accent-500 dark:border-zinc-800 dark:bg-zinc-900">
                <ListOrdered className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Questions built from your uploads — never generic filler.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-accent-500 dark:border-zinc-800 dark:bg-zinc-900">
                <CheckCircle2 className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                See which areas need another look, then go again.
              </p>
            </div>
          </div>

          <Link
            href="/signup"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent-600 transition hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            Take your first quiz
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </Section>
  );
}