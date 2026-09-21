import { getCurrentUser } from "@/app/lib/auth/get-current-user";

export async function GET(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    return Response.json({ user });
}