import { RadonStorage } from "@radonsdk/storage";

export const storage = new RadonStorage({
    providers: { s3: {} },
    defaultProvider: "s3"
})