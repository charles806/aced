import OpenAI from "openai";

export const client = new OpenAI({
  apiKey: process.env.BREWKEG_API_KEY,
  baseURL: process.env.BREWKEG_BASE_URL,
});

