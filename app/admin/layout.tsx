import { requireAdmin } from "./lib/auth";
import { AdminShell } from "./components/shell";

export const metadata = {
  title: "Admin | ACED",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return <AdminShell userId={user.id}>{children}</AdminShell>;
}
