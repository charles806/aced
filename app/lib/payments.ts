import { RadonPayments, registerProvider } from "@radonsdk/payments";
import { BachsProvider } from "./billing/bachs-provider";

// Override the stale built-in Bachs adapter (SDK v0.1.0 checkouts/cancel hit
// retired endpoints). Custom loaders resolve before built-ins, so
// `payments.subscriptions.*` and `payments.webhooks.handle` now reach the
// corrected adapter without touching node_modules. See bachs-provider.ts.
registerProvider("bachs", async () => BachsProvider);

// Determine Bachs mode from environment. Defaults to "test" for local/dev.
// Production must set RADON_BACHS_MODE=live to use live keys.
const bachsMode = (process.env.RADON_BACHS_MODE ?? "test") as "test" | "live";

export const payments = new RadonPayments({
    mode: bachsMode,
    providers: {
        bachs: {
            webhookSecret: process.env.RADON_BACHS_WEBHOOK_SECRET,
        },
    },
    defaultProvider: "bachs",
})