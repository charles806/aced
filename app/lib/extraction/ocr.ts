import { ImageAnnotatorClient } from "@google-cloud/vision";

let cachedClient: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient {
  if (cachedClient) {
    return cachedClient;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Google Cloud Vision credentials are missing. Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY.",
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