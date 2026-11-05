import { cookies } from "next/headers";
import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";

function getAllowlist(): string[] {
  return (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aced_session")?.value;

  if (!token) {
    return null;
  }

  let user;
  try {
    user = await auth.getSessionUser(token);
  } catch {
    return null;
  }

  if (!user) {
    return null;
  }

  // Fail closed if allowlist missing or empty
  const allowlist = getAllowlist();
  if (allowlist.length === 0) {
    return null;
  }

  const isAdmin = allowlist.includes(user.id);
  return isAdmin ? user : null;
}

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) {
    redirect("/signin?next=/admin");
  }
  return user;
}

// API / Server Action authorization pattern
export async function assertAdmin() {
  const user = await getAdminUser();
  if (!user) {
    // Do not leak reason; return null for caller to map to 401/403
    return null;
  }
  return user;
}
