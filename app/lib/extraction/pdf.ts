import { PDFParse } from "pdf-parse";

export async function extractPdfText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });

    try {
        const result = await parser.getText();

        return result.text.trim();
    } finally {
        await parser.destroy();
    }
}