import { radonNextHandler } from "@radonsdk/auth/integrations/next";
import { auth } from "@/app/lib/auth";

const handler = radonNextHandler(auth, {basePath: "/api/auth",
    cookieName: "aced_session",
    successRedirect: "/dashboard"
})

export const GET = handler
export const POST = handler