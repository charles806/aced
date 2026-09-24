"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/logo-mark";

const EASE = [0.22, 1, 0.36, 1] as const;

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const LIST_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function Footer() {
  const reduced = useReducedMotion();

  return (
    <footer className="border-t border-zinc-200 bg-paper-100/60 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2 lg:pr-16">
            <div className="group flex items-center gap-2.5">
              <span className="inline-block transition-transform duration-300 group-hover:animate-wiggle dark:group-hover:animate-none">
                <LogoMark />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                ACED
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              A study platform for students. Organize your materials, track
              your progress, and learn with AI — built around what you&apos;re
              actually studying.
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Product
            </h2>
            <motion.ul
              className="mt-4 space-y-3"
              initial={reduced ? false : "hidden"}
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={LIST_VARIANTS}
            >
              {NAV_LINKS.map((link) => (
                <motion.li key={link.href} variants={ITEM_VARIANTS}>
                  <a
                    href={link.href}
                    className="text-sm text-zinc-600 transition hover:text-accent-600 dark:text-zinc-400 dark:hover:text-accent-400"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </motion.ul>
          </nav>

          <nav aria-label="Account">
            <h2 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Account
            </h2>
            <motion.ul
              className="mt-4 space-y-3"
              initial={reduced ? false : "hidden"}
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={LIST_VARIANTS}
            >
              <motion.li variants={ITEM_VARIANTS}>
                <Link
                  href="/signin"
                  className="text-sm text-zinc-600 transition hover:text-accent-600 dark:text-zinc-400 dark:hover:text-accent-400"
                >
                  Log in
                </Link>
              </motion.li>
              <motion.li variants={ITEM_VARIANTS}>
                <Link
                  href="/signup"
                  className="text-sm font-medium text-accent-600 transition hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
                >
                  Start Learning
                </Link>
              </motion.li>
            </motion.ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            © {new Date().getFullYear()} ACED. Made for students.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Study smarter. Understand more. Remember what matters.
          </p>
        </div>
      </div>
    </footer>
  );
}