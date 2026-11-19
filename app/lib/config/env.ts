/**
 * Validated environment configuration.
 * Single source of truth for all environment variables.
 */

// Server-side only env vars (not exposed to client)
export const serverEnv = {
  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // App
  baseUrl: process.env.BASE_URL!,

  // Auth (Radon)
  radonSecret: process.env.RADON_SECRET!,

  // Email (Resend via Radon)
  resendApiKey: process.env.RESEND_API_KEY!,
  emailFrom: "Aced <c08445333@gmail.com>",

  // AI Providers
  nim: {
    apiKey: process.env.NIM_API_KEY!,
    baseUrl: process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
    models: {
      tutor: process.env.NIM_TUTOR_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
      summary: process.env.NIM_SUMMARY_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
      flashcards: process.env.NIM_FLASHCARDS_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
      quiz: process.env.NIM_QUIZ_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
    },
  },
  brewkeg: {
    apiKey: process.env.BREWKEG_API_KEY!,
    baseUrl: process.env.BREWKEG_BASE_URL!,
    defaultModel: process.env.DEFAULT_MODEL!,
  },
  ai: {
    primaryProvider: (process.env.AI_PRIMARY_PROVIDER as "nim" | "brewkeg") || "nim",
    fallbackProvider: (process.env.AI_FALLBACK_PROVIDER as "nim" | "brewkeg") || "brewkeg",
  },

  // Inngest
  inngest: {
    eventKey: process.env.INNGEST_EVENT_KEY!,
    signingKey: process.env.INNGEST_SIGNING_KEY!,
  },

  // Billing (Bachs)
  bachs: {
    secretKey: process.env.RADON_BACHS_SECRET_KEY!,
    webhookSecret: process.env.RADON_BACHS_WEBHOOK_SECRET!,
    mode: (process.env.RADON_BACHS_MODE as "test" | "live") || "test",
    proProductId: process.env.ACED_PRO_PRODUCT_ID!,
  },

  // Storage (S3 via Radon)
  s3: {
    accessKeyId: process.env.RADON_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.RADON_S3_SECRET_ACCESS_KEY!,
    bucket: process.env.RADON_S3_BUCKET!,
    region: process.env.RADON_S3_REGION!,
    endpoint: process.env.RADON_S3_ENDPOINT, // Optional for S3-compatible
  },

  // OCR (Google Cloud Vision)
  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL!,
    privateKey: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  },
} as const;

// Client-side safe env vars (NEXT_PUBLIC_*)
export const clientEnv = {
  // Currently no client-side env vars needed
} as const;

// Type helpers
export type ServerEnv = typeof serverEnv;
export type ClientEnv = typeof clientEnv;

// Validation - throws on missing required vars (server-side only)
export function validateServerEnv(): void {
  const required: (keyof ServerEnv)[] = [
    "databaseUrl",
    "baseUrl",
    "radonSecret",
    "resendApiKey",
    "nim",
    "brewkeg",
    "ai",
    "inngest",
    "bachs",
    "s3",
    "googleCloud",
  ];

  for (const key of required) {
    const value = serverEnv[key];
    if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Validate nested objects
  if (!serverEnv.nim.apiKey) throw new Error("NIM_API_KEY is required");
  if (!serverEnv.brewkeg.apiKey) throw new Error("BREWKEG_API_KEY is required");
  if (!serverEnv.brewkeg.baseUrl) throw new Error("BREWKEG_BASE_URL is required");
  if (!serverEnv.brewkeg.defaultModel) throw new Error("DEFAULT_MODEL is required");
  if (!serverEnv.inngest.eventKey) throw new Error("INNGEST_EVENT_KEY is required");
  if (!serverEnv.inngest.signingKey) throw new Error("INNGEST_SIGNING_KEY is required");
  if (!serverEnv.bachs.secretKey) throw new Error("RADON_BACHS_SECRET_KEY is required");
  if (!serverEnv.bachs.webhookSecret) throw new Error("RADON_BACHS_WEBHOOK_SECRET is required");
  if (!serverEnv.bachs.proProductId) throw new Error("ACED_PRO_PRODUCT_ID is required");
  if (!serverEnv.s3.accessKeyId) throw new Error("RADON_S3_ACCESS_KEY_ID is required");
  if (!serverEnv.s3.secretAccessKey) throw new Error("RADON_S3_SECRET_ACCESS_KEY is required");
  if (!serverEnv.s3.bucket) throw new Error("RADON_S3_BUCKET is required");
  if (!serverEnv.s3.region) throw new Error("RADON_S3_REGION is required");
  if (!serverEnv.googleCloud.projectId) throw new Error("GOOGLE_CLOUD_PROJECT_ID is required");
  if (!serverEnv.googleCloud.clientEmail) throw new Error("GOOGLE_CLIENT_EMAIL is required");
  if (!serverEnv.googleCloud.privateKey) throw new Error("GOOGLE_PRIVATE_KEY is required");
}

// Client-safe env (for use in client components)
export function getClientEnv(): ClientEnv {
  return clientEnv;
}