import type { Metadata } from "next";
import { BillingStatusPanel } from "@/components/billing/billing-status-panel";
import { LogoMark } from "@/components/logo-mark";

export const metadata: Metadata = {
  title: "Checkout canceled | Aced",
  description: "Your ACED Pro checkout was canceled.",
};

export default function BillingCancelledPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <header className="mx-auto flex w-full max-w-md items-center justify-center gap-2.5">
        <LogoMark />
        <span className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Aced
        </span>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 items-center py-8">
        <BillingStatusPanel view="cancelled" />
      </main>
    </div>
  );
}