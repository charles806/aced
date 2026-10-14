import { ImageAnnotatorClient } from "@google-cloud/vision";

let cachedClient: ImageAnnotatorClient | null = null;

/**
 * `GOOGLE_PROJECT_ID` is the canonical env var. `GOOGLE_CLOUD_PROJECT_ID` and
 * `GOOGLE_CLOUD_PROJECT` (both used by the gcloud tooling and previously by this
 * app) are accepted as fallbacks so a deployment that set an older name keeps
 * working.
 */
function resolveGoogleProjectId(): string | undefined {
  return (
    process.env.GOOGLE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT
  );
}

function getVisionClient(): ImageAnnotatorClient {
  if (cachedClient) {
    return cachedClient;
  }

  const projectId = resolveGoogleProjectId();
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  // Google private keys are commonly stored as a single line with escaped
  // newlines ("\n"); restore the real newlines before handing them to the SDK.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    const missing: string[] = [];
    if (!projectId) missing.push("GOOGLE_PROJECT_ID");
    if (!clientEmail) missing.push("GOOGLE_CLIENT_EMAIL");
    if (!privateKey) missing.push("GOOGLE_PRIVATE_KEY");

    throw new Error(
      `Google Vision OCR is not configured. Missing or empty: ${missing.join(
        ", ",
      )}. Add them to your environment to extract text from images.`,
    );
  }

  cachedClient = new ImageAnnotatorClient({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  return cachedClient;
}

export async function extractImageText(buffer: Buffer): Promise<string> {
  const client = getVisionClient();

  const [result] = await client.documentTextDetection({
    image: {
      content: buffer,
    },
  });

  const text = result.fullTextAnnotation?.text?.trim();

  if (!text) {
    throw new Error("No text could be extracted from image");
  }

  return text;
}