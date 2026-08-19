import { getUserFromRequest } from "@radonsdk/auth/integrations/next";
import { auth } from "@/app/lib/auth";

export async function GET(req: Request) {
    const user = await getUserFromRequest(auth, req);
    if (!user) return new Response("Unauthorized", { status: 401 });
    return Response.json({ user });
}