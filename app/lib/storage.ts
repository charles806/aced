import { RadonStorage } from "@radonsdk/storage";

export const storage = new RadonStorage({
    providers: { s3: {} },
    defaultProvider: "s3"
})

export async function getSignedFileUrl(
    key: string | null | undefined
): Promise<string | null> {
    if (!key) {
        return null;
    }

    try {
        return await storage.getUrl(key, { signed: true, expiresIn: 3600 });
    } catch (error) {
        console.error("Failed to generate signed URL:", error);
        return null;
    }
}