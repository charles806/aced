"use server"
import { cookies } from "next/headers";
import { auth, prisma } from "../lib/auth"

export async function signUp(input: { name: string; email: string; password: string }) {
    const email = input.email.trim().toLowerCase()

    const existing = await prisma.radonUser.findFirst({
        where: { email },
    })
    if (existing) {
        throw new Error("An account with this email already exists.")
    }

    // Also check for a stale RadonIdentity from a previous partial signup.
    const existingIdentity = await prisma.radonIdentity.findFirst({
        where: { provider: "email", providerAccountId: email },
    })
    if (existingIdentity) {
        throw new Error("An account with this email already exists.")
    }

    try {
        const radonUser = await auth.emailPassword.signup({
            email,
            password: input.password,
            metadata: { name: input.name.trim() }
        })
        return { ok: true as const, user: radonUser.user }
    } catch (error) {
        // Handle race condition: another request created the identity between
        // our check and the signup call.
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "P2002"
        ) {
            throw new Error("An account with this email already exists.")
        }
        throw error
    }
}

export async function login(input: { email: string, password: string }) {
    try {
        const email = input.email.trim().toLowerCase()
        const user = auth.emailPassword.login({ email, password: input.password })
        const { token, expiresAt } = auth.createSessionToken((await user).user.id)
        const cookieStore = await cookies()
        cookieStore.set("aced_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
        })

        const radonUser = await user

        return { ok: true as const, user: radonUser.user }

    } catch (error) {
        console.error("Login failed:", error)
        throw new Error("Invalid email or password.")
    }

}

export async function logout() {
    const cookieStore = await cookies()
    const token = cookieStore.get("aced_session")?.value ?? null

    // clear the session cookie on the browser
    cookieStore.set("aced_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    })

    // also revoke the server-side session rows so the token can't be reused
    if (token) {
        try {
            const user = await auth.getSessionUser(token)
            await prisma.radonSession.deleteMany({ where: { userId: user.id } })
        } catch (error) {
            // token was already invalid/expired — clearing the cookie is enough
            console.error("Session purge failed:", error)
        }
    }

    return { ok: true as const }
}