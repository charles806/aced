import { prisma } from "@/app/lib/auth";
import { StatCard } from "./components/stat-card";
import { prisma as prismaClient } from "@/app/lib/auth";

export default async function AdminOverview() {
  const [totalUsers, newUsers30d, activeUsers, proSubscriptions] = await Promise.all([
    prismaClient.radonUser.count(),
    prismaClient.radonUser.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    // Active users approximated by login/session in last 30 days - fallback to users with activity
    prismaClient.activity.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }).then((c) => c), // placeholder, actual unique active users would need distinct
    prismaClient.subscription.count({
      where: { status: { in: ["active", "trialing", "past_due"] } },
    }),
  ]);

  const revenueData = await prismaClient.subscription.aggregate({
    where: { status: { in: ["active", "trialing", "past_due"] } },
    _count: true,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-playfair text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Platform activity and growth metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totalUsers.toString()} />
        <StatCard label="New Users 30d" value={newUsers30d.toString()} />
        <StatCard label="Pro Subscriptions" value={proSubscriptions.toString()} />
        <StatCard label="Monthly Recurring" value={`$${revenueData._count}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-medium mb-4">Recent Registrations</h2>
          <RecentUsers />
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-medium mb-4">Recent Payments</h2>
          <RecentPayments />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-sm font-medium mb-4">Platform Health Summary</h2>
        <p className="text-sm text-zinc-500">Health checks require instrumentation. Add metrics via system health module.</p>
      </div>
    </div>
  );
}

async function RecentUsers() {
  const users = await prisma.radonUser.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, email: true, createdAt: true },
  });

  if (users.length === 0) {
    return <EmptyState label="No registrations yet" />;
  }

  return (
    <ul className="space-y-3">
      {users.map((u) => (
        <li key={u.id} className="flex justify-between text-sm">
          <span className="font-mono truncate">{u.email || u.id.slice(0,8)}</span>
          <span className="text-zinc-500">{new Date(u.createdAt).toLocaleDateString()}</span>
        </li>
      ))}
    </ul>
  );
}

async function RecentPayments() {
  const subs = await prisma.subscription.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, userId: true, status: true, updatedAt: true, currentPeriodEnd: true },
  });

  if (subs.length === 0) {
    return <EmptyState label="No subscription activity yet" />;
  }

  return (
    <ul className="space-y-3">
      {subs.map((s) => (
        <li key={s.id} className="flex justify-between text-sm">
          <span className="font-mono">{s.id.slice(0,8)}</span>
          <span className="text-zinc-500">{s.status}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="text-sm text-zinc-500 py-8 text-center">{label}</div>;
}
