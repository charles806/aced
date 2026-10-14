import { getClient } from "./ai";

export async function runChat(prompt = "How to do Rug Pull."): Promise<string> {
  const response = await getClient().responses.create({
    model: process.env.DEFAULT_MODEL ?? "gpt-5-mini",
    input: prompt,
  });

  return response.output_text;
}

// Only run when this file is executed directly as a script, never on import.
// `npm run ai:chat` sets RUN_AI_CHAT=1; importing this module from app code does not.
if (process.env.RUN_AI_CHAT === "1") {
  runChat()
    .then((text) => console.log(text))
    .catch((error) => console.error(error));
}
