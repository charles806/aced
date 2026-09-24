import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Annotation } from "./annotation";
import { PaperCard } from "./paper-card";
import { Reveal } from "./reveal";
import { Section } from "./section";

export function AITutorSection() {
  return (
    <Section id="ai-tutor" className="pb-4">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal direction="right">
          <div className="relative">
            <Annotation
              variant="pin"
              tilt={-2}
              className="absolute -top-7 left-10 z-10"
            >
              your notes, in context
            </Annotation>
            <div className="paper-grain rounded-2xl border border-zinc-200 bg-paper-100 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <PaperCard className="overflow-hidden">
                <Image
                  src="/previews/ai-tutor.svg"
                  alt="AI Tutor chat preview showing a student question and an explanation grounded in their notes"
                  width={1200}
                  height={780}
                  className="h-auto w-full"
                />
              </PaperCard>
            </div>
            <Annotation
              variant="tape"
              tilt={2}
              className="absolute -bottom-5 right-6 z-10"
            >
              ask about what you&apos;re studying
            </Annotation>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.06}>
          <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            AI Tutor
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Stuck on something? Ask your own material.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            The AI Tutor answers questions using your notes, PDFs and
            flashcards — so explanations stay close to what you&apos;re
            actually studying. Ask follow-ups, go deeper on one idea, or
            test yourself before class.
          </p>
          <ul className="mt-6 space-y-3">
            <li className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <CameraCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />
              <span>
                Answers reference the material you uploaded — not just general
                knowledge.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <NotePad aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />
              <span>
                It explains, it doesn&apos;t do the work for you — you stay in
                control of what you learn.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />
              <span>
                AI can be wrong sometimes — always double-check what matters.
              </span>
            </li>
          </ul>
          <Link
            href="/signup"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent-600 transition hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            Try the AI Tutor
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </Section>
  );
}

function CameraCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2z" />
      <path d="m9.5 11.5 2 2 4-4" />
    </svg>
  );
}

function NotePad(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
      <path d="M15 3v6h6M8.5 13l4 4M12.5 13l-4 4" />
    </svg>
  );
}

function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 5-5.5" />
    </svg>
  );
}