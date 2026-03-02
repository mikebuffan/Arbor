import { openAIEmbed, openAIEmbedMany } from "@/lib/providers/openai";

const MAX_EMBED_CHARS = 8000;
const DEFAULT_BATCH_SIZE = 96;

function clean(text: string) {
  return String(text ?? "").slice(0, MAX_EMBED_CHARS);
}

export async function embedText(text: string): Promise<number[]> {
  const cleaned = clean(text);
  return openAIEmbed(cleaned);
}

export async function embedTexts(texts: string[], batchSize = DEFAULT_BATCH_SIZE): Promise<number[][]> {
  const cleaned = texts.map(clean);

  const out: number[][] = [];
  for (let i = 0; i < cleaned.length; i += batchSize) {
    const batch = cleaned.slice(i, i + batchSize);
    const embs = await openAIEmbedMany(batch);
    out.push(...embs);
  }
  return out;
}

export function memoryToEmbedString(key: string, value: any) {
  return `key:${key}\nvalue:${JSON.stringify(value)}`;
}