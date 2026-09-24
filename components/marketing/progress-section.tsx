import Image from "next/image";
import { ArrowRight, Flame, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Annotation } from "./annotation";
import { PaperCard } from "./paper-card";
import { Reveal } from "./reveal";
import { Section } from "./section";

export function ProgressSection() {
  return (
    <Section id="progress" className="pb-4">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal direction="right">
          <div className="relative">
            <Annotation
              variant="pin"
              tilt={2}
              className="absolute -top-7 left-8 z-10"
            >
              consistency is the point
            </Annotation>
            <div className="paper-grain rounded-2xl border border-zinc-200 bg-paper-100 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <PaperCard className="overflow-hidden">
                <Image
                  src="/previews/progress.svg"
                  alt="Study progress preview showing hours studied, subject progress bars and a day streak"
                  width={1200}
                  height={780}
                  className="h-auto w-full"
                />
              </PaperCard>
            </div>
            <Annotation
              variant="tape"
              tilt={-1.8}
              className="absolute -bottom-5 left-10 z-10"
            >
              small steps, real momentum
            </Annotation>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.06}>
          <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            Study progress
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            See how far you&apos;ve come — and where to go next
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            ACED turns study time into a clear picture: minutes this week,
            day streaks, and subject-by-subject progress. Motivation you can
            actually see, without turning learning into a numbers game.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-4 sm:max-w-md">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
                <Flame className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <p className="mt-3 font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Day streaks
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                build a habit you don&apos;t want to break
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
                <TrendingUp className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <p className="mt-3 font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Subject progress
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                see which subjects need attention
              </p>
            </div>
          </div>

          <Link
            href="/signup"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent-600 transition hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            Start tracking your study time
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </Section>
  );
}