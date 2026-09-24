import Image from "next/image";
import { BookOpen, BrainCircuit, LineChart, Repeat } from "lucide-react";
import { Annotation } from "./annotation";
import { Reveal } from "./reveal";
import { Section } from "./section";
import { Stagger, StaggerItem } from "./stagger";
import { CountUp } from "@/components/dashboard/micro-motion";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Organize",
    color: "text-accent-600 dark:text-accent-400",
    chip: "Organize",
    copy: "Subjects, notes, PDFs and images — everything in one calm place. No more digging through folders.",
    tint: "border-accent-200 bg-accent-50/50 dark:border-accent-500/30 dark:bg-accent-500/10",
  },
  {
    icon: BrainCircuit,
    title: "Learn",
    color: "text-violet-600 dark:text-violet-400",
    chip: "Learn",
    copy: "AI turns your own materials into summaries, flashcards and quizzes — and a tutor that explains things your way.",
    tint: "border-violet-200 bg-violet-50/50 dark:border-violet-500/30 dark:bg-violet-500/10",
  },
  {
    icon: LineChart,
    title: "Track",
    color: "text-emerald-600 dark:text-emerald-400",
    chip: "Track",
    copy: "Study minutes, day streaks and subject progress add up into a picture of your consistency.",
    tint: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10",
  },
  {
    icon: Repeat,
    title: "Practice",
    color: "text-amber-600 dark:text-amber-400",
    chip: "Practice",
    copy: "Flip flashcards and take quizzes whenever it suits you — built from what you actually uploaded.",
    tint: "border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/10",
  },
];

const SPANS = [
  "lg:col-span-5",
  "lg:col-span-7",
  "lg:col-span-7",
  "lg:col-span-5",
];

export function Features() {
  return (
    <Section id="features" className="pb-4">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <Reveal className="max-w-xl">
          <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            One study app
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Organize, learn, track and practice — without leaving your notes
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <Annotation variant="tape" tilt={2}>
            it&apos;s all connected ✎
          </Annotation>
        </Reveal>
      </div>

      <Stagger className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {FEATURES.map((feature, index) => (
          <StaggerItem
            key={feature.title}
            className={SPANS[index]}
          >
            <div
              className={`group flex h-full flex-col gap-8 rounded-2xl border bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:rotate-[0.5deg] hover:shadow-md dark:bg-zinc-900 ${feature.tint}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:animate-float dark:group-hover:animate-none ${feature.tint}`}
                  style={{ ["--tilt" as string]: "0deg" }}
                >
                  <feature.icon
                    className={`h-5 w-5 ${feature.color}`}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                </span>
                <CountUp
                  value={`0${index + 1}`}
                  className="font-display text-sm italic text-zinc-400 dark:text-zinc-500"
                />
              </div>
              <div>
                <span className="inline-block rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                  {feature.chip}
                </span>
                <h3 className="mt-3 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {feature.copy}
                </p>
              </div>

              {index === 1 ? (
                <div className="mt-auto rotate-[-1deg]">
                  <Image
                    src="/previews/ai-tutor.svg"
                    alt="AI Tutor conversation preview"
                    width={1200}
                    height={780}
                    className="w-full rounded-xl border border-zinc-200 shadow-md dark:border-zinc-800"
                  />
                </div>
              ) : null}
              {index === 2 ? (
                <div className="mt-auto rotate-[1deg]">
                  <Image
                    src="/previews/progress.svg"
                    alt="Study progress preview"
                    width={1200}
                    height={780}
                    className="w-full rounded-xl border border-zinc-200 shadow-md dark:border-zinc-800"
                  />
                </div>
              ) : null}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}