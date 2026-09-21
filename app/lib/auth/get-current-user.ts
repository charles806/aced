import { getUserFromRequest } from "@radonsdk/auth/integrations/next";
import { auth } from "@/app/lib/auth";

export async function getCurrentUser(req: Request) {
  const user = await getUserFromRequest(
    auth,
    req,
    { cookieName: "aced_session" }
  );

  return user;
}