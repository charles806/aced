import { prisma } from "@/app/lib/auth";
import { notFound } from "next/navigation";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const user = await prisma.radonUser.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, createdAt: true, updatedAt: true },
  });

  if (!user) return notFound();

  const [subscription, annuals, notesCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { id: true, plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, createdAt: true, updatedAt: true },
    }),
    prisma.annualPurchase.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, status: true, amountUsd: true, currency: true, createdAt: true, expiresAt: true, plan: true },
    }),
    prisma.note.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-playfair text-3xl font-semibold">User Detail</h1>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
        <div><span className="text-zinc-500 text-sm">User ID</span><div className="font-mono text-sm">{user.id}</div></div>
        <div><span className="text-zinc-500 text-sm">Email</span><div>{user.email || "—"}</div></div>
        <div><span className="text-zinc-500 text-sm">Registered</span><div>{new Date(user.createdAt).toLocaleString()}</div></div>
        <div><span className="text-zinc-500 text-sm">Notes</span><div>{notesCount}</div></div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="font-medium mb-3">Subscription</h2>
        {subscription ? (
          <pre className="text-xs overflow-auto">{JSON.stringify(subscription, null, 2)}</pre>
        ) : (
          <div className="text-sm text-zinc-500">No subscription</div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="font-medium mb-3">Annual Purchases</h2>
        {annuals.length === 0 ? <div className="text-sm text-zinc-500">None</div> : (
          <ul className="space-y-2 text-sm">
            {annuals.map(a => (
              <li key={a.id} className="font-mono">{a.id} • {a.status} • {a.amountUsd} {a.currency}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
