import { openAIEmbed } from "@/lib/providers/openai";

const MAX_EMBED_CHARS = 8000;

export async function embedText(text: string): Promise<number[]> {
  const cleaned = String(text ?? "").slice(0, MAX_EMBED_CHARS);
  return openAIEmbed(cleaned);
}

export function memoryToEmbedString(key: string, value: any) {
  return `key:${key}\nvalue:${JSON.stringify(value)}`;
}
