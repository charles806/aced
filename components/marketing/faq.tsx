"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Annotation } from "./annotation";
import { cx } from "./lib/cx";
import { Reveal } from "./reveal";
import { Section } from "./section";
import { Stagger, StaggerItem } from "./stagger";

const EASE = [0.22, 1, 0.36, 1] as const;

const FAQS = [
  {
    question: "What is ACED?",
    answer:
      "ACED is a study platform that keeps your subjects, notes and files organized, tracks your study time and progress, and uses AI to help you understand and remember what you're learning.",
  },
  {
    question: "Who is ACED for?",
    answer:
      "High school and university students who want their notes in one place and a bit of AI help along the way. If you're studying for exams, quizzes or just staying on top of classes, ACED fits.",
  },
  {
    question: "What can I upload?",
    answer:
      "You can upload PDFs and images, and write notes directly in ACED. Group everything under subjects so your study materials stay organized.",
  },
  {
    question: "What does ACED Pro include?",
    answer:
      "Pro adds the AI features: AI Tutor, AI summaries, AI flashcards, and AI quizzes, plus advanced study insights. Everything in Free stays included, and future premium features come at no extra cost.",
  },
  {
    question: "How does the AI Tutor work?",
    answer:
      "You ask a question about what you're studying, and the AI Tutor answers using your uploaded notes and materials as context. It's a study aid — like every AI, it can be wrong sometimes, so it's worth checking key facts.",
  },
  {
    question: "Can I use ACED without Pro?",
    answer:
      "Yes. Subjects, notes, uploads, search, study tracking and the dashboard are all free. You only need Pro when you want the AI features.",
  },
  {
    question: "How does billing work?",
    answer:
      "Pro is $1.99 every 30 days, charged through our payment provider. You'll see clear confirmation after checkout and can manage everything from your subscription settings.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Anytime, from your dashboard settings. Your Pro access stays active until the period ends, then you keep your data on Free.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section id="faq" className="pb-4">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.6fr]">
        <Reveal>
          <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Questions students actually ask
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Can&apos;t find what you need? Start a free account and poke around
            — the dashboard explains itself.
          </p>
          <div className="mt-8">
            <Annotation variant="tape" tilt={1.5} className="hidden sm:inline-flex">
              usually this fast to answer
            </Annotation>
          </div>
        </Reveal>

        <Stagger delay={0.08} className="space-y-3">
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <StaggerItem key={faq.question}>
                <div
                  className={cx(
                    "overflow-hidden rounded-2xl border transition-colors",
                    open
                      ? "border-accent-200 bg-white shadow-sm dark:border-accent-500/30 dark:bg-zinc-900"
                      : "border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : index)}
                    aria-expanded={open}
                    aria-controls={`faq-panel-${index}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
                  >
                    <span className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {faq.question}
                    </span>
                    <Plus
                      className={cx(
                        "h-5 w-5 shrink-0 text-accent-500 transition-transform duration-300",
                        open && "rotate-45",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        key={`faq-panel-${index}`}
                        id={`faq-panel-${index}`}
                        role="region"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {faq.answer}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </Section>
  );
}