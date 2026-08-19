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

    const radonUser = await auth.emailPassword.signup({
        email,
        password: input.password,
        metadata: { name: input.name.trim() }
    })

    let appUser
    try {
        appUser = await prisma.user.upsert({
            where: { email },
            update: { name: input.name.trim() },
            create: { email, name: input.name.trim() },
        })
    } catch (error) {
        // Mirror write failed — roll back the Radon account so we never leave
        // a half-created user behind, then rethrow for the client.
        try {
            await prisma.radonIdentity.deleteMany({ where: { userId: radonUser.user.id } })
            await prisma.radonSession.deleteMany({ where: { userId: radonUser.user.id } })
            await prisma.radonUser.delete({ where: { id: radonUser.user.id } })
        } catch (cleanupError) {
            console.error("Failed to clean up Radon user after mirror failure:", cleanupError)
        }
        throw error
    }

    return { ok: true as const, user: appUser }
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
        const rawName = radonUser.user.metadata?.name
        const name = typeof rawName === "string" ? rawName : null

        const appUser = await prisma.user.upsert({
            where: { email },
            update: { name },
            create: { email, name }
        })

        return { ok: true as const, user: appUser }

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