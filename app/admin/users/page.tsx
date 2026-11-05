import { prisma } from "@/app/lib/auth";
import Link from "next/link";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const rawQ = (searchParams.q || "").trim();
  const q = rawQ.slice(0, 100); // limit length
  const rawPage = Number(searchParams.page || 1);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const maxPage = 1000;
  const safePage = Math.min(page, maxPage);
  const take = 20;
  const skip = (safePage - 1) * take;

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { id: { contains: q } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.radonUser.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    }),
    prisma.radonUser.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));
  const displayPage = safePage;

  return (
    <div className="space-y-6">
      <h1 className="font-playfair text-3xl font-semibold">Users</h1>

      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search email or ID" className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 text-sm">Search</button>
      </form>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">User ID</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-3 font-mono text-xs">{u.id.slice(0,12)}</td>
                <td className="px-4 py-3">{u.email || "—"}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/users/${u.id}`} className="text-accent-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between text-sm">
        <span>Page {displayPage} of {totalPages}</span>
        <div className="flex gap-2">
          {displayPage > 1 && <Link href={`?q=${encodeURIComponent(q)}&page=${displayPage-1}`} className="underline">Prev</Link>}
          {displayPage < totalPages && <Link href={`?q=${encodeURIComponent(q)}&page=${displayPage+1}`} className="underline">Next</Link>}
        </div>
      </div>
    </div>
  );
}
