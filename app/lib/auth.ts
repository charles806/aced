import { prismaAdapter } from "@radonsdk/auth/adapters/prisma";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Radon } from "@radonsdk/auth";
import { resendSender } from "@radonsdk/auth/senders/resend";
import type { PasswordHasher } from "@radonsdk/auth";
import argon2 from "argon2";

export const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
})


const argonHasher: PasswordHasher = {
    hash: (plain) => argon2.hash(plain),
    verify: (plain, hash) => argon2.verify(hash, plain),
};

export const auth = new Radon({
    adapter: prismaAdapter(prisma),
    session: { secret: process.env.RADON_SECRET! },
    appName: "Aced",
    rateLimit: {maxPerWindow: 3, windowMs:600_00},
    providers: {
        emailPassword: {
            sender: resendSender({ apiKey: process.env.RESEND_API_KEY!, from: "Aced <c08445333@gmail.com>" }),
            resetUrl: `${process.env.BASE_URL}/api/auth/password/reset`,
            minLength: 8,
            hasher: argonHasher
        }
    }
})