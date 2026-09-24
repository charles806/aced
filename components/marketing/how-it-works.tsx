"use client";

import { useRef } from "react";
import { BookUp, FolderTree, Sparkles, TrendingUp } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Annotation } from "./annotation";
import { Reveal } from "./reveal";
import { Section } from "./section";
import { Stagger, StaggerItem } from "./stagger";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  {
    icon: BookUp,
    step: "01",
    title: "Add your materials",
    copy: "Upload notes, PDFs and images — or jot new notes straight into ACED.",
  },
  {
    icon: FolderTree,
    step: "02",
    title: "Organize into subjects",
    copy: "Group everything under subjects so your study space stays calm and findable.",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Learn with ACED",
    copy: "Get AI summaries, flashcards, quizzes and answers to your questions — all from your own material.",
  },
  {
    icon: TrendingUp,
    step: "04",
    title: "Track your progress",
    copy: "Watch study time and streaks build up, and see what's ready next.",
  },
];

const NUMBER_VARIANTS = {
  hidden: { scale: 0.5, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: EASE },
  },
};

export function HowItWorks() {
  const reduced = useReducedMotion();
  const stepsRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: stepsRef,
    offset: ["start 0.85", "end 0.3"],
  });
  const dashOffset = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [1, 0]);

  return (
    <Section id="how-it-works" className="pb-4">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
          How ACED works
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          From upload to understanding in four steps
        </h2>
      </Reveal>

      <div ref={stepsRef} className="relative mt-14">
        <svg
          aria-hidden="true"
          className="absolute top-8 hidden h-8 w-full lg:block"
          style={{ insetInlineStart: "10%", insetInlineEnd: "10%" }}
          viewBox="0 0 1000 32"
          preserveAspectRatio="none"
          fill="none"
        >
          <motion.path
            d="M0 16 H1000"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={dashOffset}
            stroke="currentColor"
            strokeWidth={2}
            className="text-zinc-200 dark:text-zinc-800"
          />
        </svg>
        <Stagger className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <StaggerItem key={step.step}>
              <div className="relative flex flex-col items-start lg:items-center lg:text-center">
                <div className="relative">
                  <div className="paper-grain relative flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <step.icon
                      className="h-6 w-6 text-accent-500"
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                  </div>
                  <motion.span
                    variants={NUMBER_VARIANTS}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 font-mono text-[11px] font-semibold text-white shadow-sm shadow-accent-500/40"
                  >
                    {step.step.replace("0", "")}
                  </motion.span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {step.title}
                </h3>
                <p className="mt-1.5 max-w-[15rem] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {step.copy}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      <Reveal delay={0.2} className="mt-12">
        <Annotation variant="tape" tilt={-1.5} className="hidden sm:inline-flex">
          from first upload to first streak ✦
        </Annotation>
      </Reveal>
    </Section>
  );
}