"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/logo-mark";
import { cx } from "./lib/cx";

const EASE = [0.22, 1, 0.36, 1] as const;

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-zinc-200/80 bg-paper-50/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85"
          : "bg-transparent",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
          aria-label="ACED home"
        >
          <span className="inline-block transition-transform duration-300 group-hover:animate-wiggle dark:group-hover:animate-none">
            <LogoMark />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            ACED
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-50"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/signin"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition hover:text-zinc-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:text-zinc-200 dark:hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-md hover:shadow-accent-500/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40"
          >
            Start Learning
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 md:hidden dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="mobile-menu"
            initial={reduced ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="fixed inset-x-0 top-16 bottom-0 z-40 border-t border-zinc-200 bg-paper-50 md:hidden dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex h-full flex-col gap-1 overflow-y-auto px-4 py-6">
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
                  },
                }}
              >
                {NAV_LINKS.map((link) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    variants={{
                      hidden: { opacity: 0, y: reduced ? 0 : 12 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.3, ease: EASE },
                      },
                    }}
                    className="block rounded-xl px-3 py-3 text-base font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {link.label}
                  </motion.a>
                ))}
              </motion.div>
              <div className="mt-auto flex flex-col gap-3 pb-6 pt-8">
                <Link
                  href="/signin"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600"
                >
                  Start Learning
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}