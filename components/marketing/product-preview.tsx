import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Annotation } from "./annotation";
import { PaperCard } from "./paper-card";
import { Reveal } from "./reveal";
import { Section } from "./section";

export function ProductPreview() {
  return (
    <Section id="product-preview" className="pb-4">
      <div className="relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            The product
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Your whole study life, in one quiet place
          </h2>
        </Reveal>

        <div className="relative mt-14">
          {/* Supporting cards behind */}
          <PaperCard
            tilt={-3}
            className="absolute left-0 top-10 hidden w-56 overflow-hidden lg:block"
          >
            <Image
              src="/previews/progress.svg"
              alt=""
              aria-hidden="true"
              width={1200}
              height={780}
              className="h-auto w-full opacity-90"
            />
          </PaperCard>
          <PaperCard
            tilt={3}
            className="absolute right-0 top-16 hidden w-52 overflow-hidden lg:block"
          >
            <Image
              src="/previews/flashcards.svg"
              alt=""
              aria-hidden="true"
              width={1200}
              height={780}
              className="h-auto w-full opacity-90"
            />
          </PaperCard>

          <div className="relative mx-auto max-w-4xl">
            <Annotation
              variant="tape"
              tilt={-2.5}
              className="absolute -top-6 left-8 z-10 hidden sm:inline-flex"
            >
              Your study space
            </Annotation>
            <Annotation
              variant="pin"
              tilt={1.5}
              className="absolute -right-3 top-10 z-10 hidden md:inline-flex"
            >
              One dashboard for it all
            </Annotation>

            <div className="paper-grain rounded-2xl border border-zinc-200 bg-paper-100 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <PaperCard className="overflow-hidden">
                <Image
                  src="/previews/dashboard.svg"
                  alt="The ACED dashboard preview: study timer, weekly progress chart, subjects and notes"
                  width={1200}
                  height={780}
                  className="h-auto w-full"
                />
              </PaperCard>
            </div>
          </div>

          {/* Bottom annotation strip */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex flex-col items-start gap-1.5 text-left">
              <Annotation variant="plain" tilt={-1}>
                Track your progress
              </Annotation>
              <p className="max-w-[16rem] text-sm text-zinc-500 dark:text-zinc-400">
                see time, streaks and subject progress at a glance
              </p>
            </div>
            <div className="flex flex-col items-start gap-1.5 text-left sm:items-center">
              <Annotation variant="plain" tilt={0.5}>
                Ask your AI Tutor
              </Annotation>
              <p className="max-w-[16rem] text-sm text-zinc-500 dark:text-zinc-400">
                get help on anything you&apos;re studying
              </p>
            </div>
            <div className="flex flex-col items-start gap-1.5 text-left sm:items-end">
              <Annotation variant="plain" tilt={1}>
                Keep it all organized
              </Annotation>
              <p className="max-w-[16rem] text-sm text-zinc-500 dark:text-zinc-400">
                subjects, notes, PDFs and images in one place
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-accent-600 transition hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
            >
              Create your study space — it&apos;s free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}