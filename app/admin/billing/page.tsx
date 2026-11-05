import { prisma } from "@/app/lib/auth";

export default async function BillingPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      userId: true,
      status: true,
      plan: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      createdAt: true,
    },
  });

  const annualPurchases = await prisma.annualPurchase.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      userId: true,
      status: true,
      amountUsd: true,
      currency: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return (
    <div className="space-y-8">
      <h1 className="font-playfair text-3xl font-semibold">Billing</h1>

      <section>
        <h2 className="text-lg font-medium mb-3">Monthly Subscriptions</h2>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left">Sub ID</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Period</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(s => (
                <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-mono text-xs">{s.id.slice(0,8)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.userId.slice(0,8)}</td>
                  <td className="px-4 py-3">{s.status}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {s.currentPeriodStart ? new Date(s.currentPeriodStart).toLocaleDateString() : "—"} → {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Annual Purchases</h2>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left">Purchase ID</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {annualPurchases.map(p => (
                <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-mono text-xs">{p.id.slice(0,8)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.userId.slice(0,8)}</td>
                  <td className="px-4 py-3">{p.amountUsd} {p.currency}</td>
                  <td className="px-4 py-3">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
