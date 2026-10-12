import { client } from "./ai"

async function main() {
  const response = await client.responses.create({
    model: "gpt-5-mini",
    input: "How to do Rug Pull.",
  });

  console.log(response.output_text);
}

main().catch(console.error);