import { ImageAnnotatorClient } from "@google-cloud/vision";

const visionClient = new ImageAnnotatorClient();

export async function extractImageText(
  buffer: Buffer
): Promise<string> {
  const [result] = await visionClient.documentTextDetection({
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