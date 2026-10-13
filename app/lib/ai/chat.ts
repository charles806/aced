import { getClient } from "./ai";

async function main() {
  const response = await getClient().responses.create({
    model: process.env.DEFAULT_MODEL ?? "gpt-5-mini",
    input: "How to do Rug Pull.",
  });

  console.log(response.output_text);
}

main().catch(console.error); // This is a standalone script; importing it will execute it.