"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "./reveal";
import { Section } from "./section";
import { CountUp } from "@/components/dashboard/micro-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const ALL_FEATURES = [
  "Subjects & notes",
  "Unlimited PDF and image uploads",
  "Search and filtering",
  "Study tracking",
  "Dashboard & statistics",
  "Unlimited AI Tutor messages",
  "AI summaries",
  "Unlimited AI flashcards",
  "Unlimited AI quizzes",
  "Advanced study insights",
];

const LIST_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

function FeatureList({
  items,
  listClassName,
  icon: Icon,
}: {
  items: string[];
  listClassName: string;
  icon: typeof Check;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.ul
      className={listClassName}
      initial={reduced ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={LIST_VARIANTS}
    >
      {items.map((feature) => (
        <motion.li
          key={feature}
          className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
          variants={ITEM_VARIANTS}
        >
          <Icon
            className="mt-0.5 h-4 w-4 shrink-0 text-accent-500"
            strokeWidth={2.4}
            aria-hidden="true"
          />
          {feature}
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function Pricing() {
  return (
    <Section id="pricing" className="pb-4">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
          Pricing
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Completely free. Forever.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Every study tool is free — no limits, no subscriptions, no paywalls.
        </p>
      </Reveal>

      <div className="mx-auto mt-14 max-w-xl">
        <Reveal className="flex">
          <div className="relative flex w-full flex-col rounded-2xl border-2 border-accent-500 bg-white p-8 shadow-[0_8px_32px_-12px_rgba(255,78,136,0.4)] dark:animate-none dark:bg-zinc-900 dark:shadow-[0_8px_32px_-12px_rgba(255,78,136,0.35)]">
            <div className="absolute right-0 top-0 rounded-bl-xl bg-accent-500 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white">
              Free forever
            </div>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                ACED
                <Sparkles className="h-4 w-4 text-accent-500" aria-hidden="true" />
              </h3>
            </div>
            <p className="mt-4 flex items-baseline gap-1">
              <CountUp
                value="$0"
                className="font-display text-4xl font-semibold text-zinc-900 dark:text-zinc-50"
              />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                / forever
              </span>
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Unlock the full AI-powered study experience at no cost.
            </p>
            <FeatureList
              items={ALL_FEATURES}
              listClassName="mt-6 flex-1 space-y-3"
              icon={Check}
            />
            <Link
              href="/signup"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-accent-500/30 transition hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-lg hover:shadow-accent-500/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40"
            >
              Get started free
            </Link>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.15} className="mt-8 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No subscription to manage — just sign up and start studying.
        </p>
      </Reveal>
    </Section>
  );
}