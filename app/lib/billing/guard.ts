/**
 * Reusable server-side access guard for premium API routes.
 *
 * Usage:
 *   const user = await getCurrentUser(req);
 *   if (!user) return jsonError("Unauthorized", 401);
 *
 *   const guard = await requireProAccess(user.id);
 *   if (!guard.ok) return guard.response;
 *
 *   // ... proceed with premium logic
 */

import { jsonError } from "@/app/lib/api";
import { hasProAccess } from "./entitlement";

export type ProAccessResult =
    | { ok: true }
    | { ok: false; response: Response };

/**
 * Verify the user has an active Pro subscription.
 *
 * Returns `{ ok: true }` when the user is entitled to Pro features.
 * Returns `{ ok: false, response }` with a 403 JSON error when they are not.
 *
 * Never trust frontend state — this queries the database every time.
 */
export async function requireProAccess(userId: string): Promise<ProAccessResult> {
    const isPro = await hasProAccess(userId);

    if (!isPro) {
        return {
            ok: false,
            response: jsonError("ACED Pro is required", 403),
        };
    }

    return { ok: true };
}
