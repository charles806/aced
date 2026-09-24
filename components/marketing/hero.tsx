"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Annotation } from "./annotation";

const EASE = [0.22, 1, 0.36, 1] as const;

const LINE_VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

export function Hero() {
  const reduced = useReducedMotion();
  const previewRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: previewRef,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 70]);

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 dotted-bg opacity-[0.35] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] dark:opacity-[0.25]"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.a
            href="#features"
            initial={reduced ? false : { opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
            className="group inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50/70 px-3.5 py-1.5 text-xs font-medium text-accent-700 transition hover:bg-accent-100 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-300 dark:hover:bg-accent-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI-powered study, built around your materials
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </motion.a>

          <motion.h1
            initial={reduced ? false : "hidden"}
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.12, delayChildren: 0.1 },
              },
            }}
            className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50"
          >
            <motion.span className="block" variants={LINE_VARIANTS}>
              Study smarter.
            </motion.span>
            <motion.span
              className="block text-accent-600 dark:text-accent-400"
              variants={LINE_VARIANTS}
            >
              Understand more.
            </motion.span>
            <motion.span className="block" variants={LINE_VARIANTS}>
              Remember what matters.
            </motion.span>
          </motion.h1>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.42 }}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400"
          >
            ACED keeps your notes organized, stays on top of your study
            progress, and uses AI to help you actually understand what
            you&apos;re learning — not just memorise it.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.52 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-accent-500/30 transition hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-lg hover:shadow-accent-500/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 sm:w-auto"
            >
              Start Learning
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#product-preview"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 sm:w-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Explore ACED
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </motion.div>

          {/* Product visual */}
          <div ref={previewRef} className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
            <Annotation
              variant="tape"
              tilt={-3}
              className="animate-float absolute -top-5 left-6 z-10 hidden sm:inline-flex"
            >
              Your study space
            </Annotation>
            <Annotation
              variant="pin"
              tilt={2.5}
              className="animate-float absolute -right-4 top-16 z-10 hidden lg:inline-flex"
            >
              Track your progress
            </Annotation>
            <Annotation
              variant="tape"
              tilt={2}
              className="animate-float absolute -bottom-5 right-14 z-10 hidden sm:inline-flex"
            >
              Ask your AI Tutor
            </Annotation>

            <motion.div
              style={reduced ? undefined : { y: parallaxY }}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_2px_4px_rgba(24,24,27,0.04),0_24px_48px_-24px_rgba(24,24,27,0.25)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)]"
            >
              <Image
                src="/previews/dashboard.svg"
                alt="ACED study dashboard showing the study timer, weekly progress chart, and subjects"
                width={1200}
                height={780}
                priority
                className="h-auto w-full"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}