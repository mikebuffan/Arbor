import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type ModelMessage = {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
};

export async function generateWithOpenAI(messages: ModelMessage[]) {
  const model = process.env.OPENAI_MODEL ?? "gpt-5";

  const res = await client.responses.create({
    model,
    input: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return res.output_text?.trim() || "";
}
