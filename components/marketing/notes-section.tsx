import Image from "next/image";
import { ArrowRight, LibrarySquare, Search, Upload } from "lucide-react";
import Link from "next/link";
import { Annotation } from "./annotation";
import { PaperCard } from "./paper-card";
import { Reveal } from "./reveal";
import { Section } from "./section";

export function NotesSection() {
  return (
    <Section id="notes" className="pb-4">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1 lg:pr-6">
          <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            Notes &amp; Subjects
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Every subject, note and file — organized the way you study
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Upload notes, PDFs, slides and images, then group them under
            subjects. Search and filter in a click, so the file you need is
            never buried.
          </p>

          <div className="mt-7 space-y-4">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-accent-500 dark:border-zinc-800 dark:bg-zinc-900">
                <Upload className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Drop in anything — written notes, PDFs, photos of diagrams.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-accent-500 dark:border-zinc-800 dark:bg-zinc-900">
                <LibrarySquare className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Keep subjects tidy — notes and resources together.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-accent-500 dark:border-zinc-800 dark:bg-zinc-900">
                <Search className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Find anything fast with search and file-type filters.
              </p>
            </div>
          </div>

          <Link
            href="/signup"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent-600 transition hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            Start organizing
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Reveal>

        <Reveal direction="left" delay={0.06} className="order-1 lg:order-2">
          <div className="relative">
            <Annotation
              variant="tape"
              tilt={-2}
              className="absolute -top-6 right-10 z-10"
            >
              units, notes, files ✦
            </Annotation>
            <div className="paper-grain rounded-2xl border border-zinc-200 bg-paper-100 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <PaperCard className="overflow-hidden">
                <Image
                  src="/previews/notes.svg"
                  alt="Notes and subjects preview showing subject cards with progress bars and a recent notes list"
                  width={1200}
                  height={780}
                  className="h-auto w-full"
                />
              </PaperCard>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}