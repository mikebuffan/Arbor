import { z } from "zod";
import { openai } from "@/lib/providers/openai";
import { SENSITIVE_CATEGORIES } from "./rules";
import type { MemoryItem } from "./types";

// Accept primitive OR object for value
const LooseValue = z.union([
  z.record(z.string(), z.any()),
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

// Make optional fields optional so we can default them
const MemoryItemSchema = z.object({
  key: z.string().min(3),
  value: LooseValue,

  // optional -> we will default
  tier: z.enum(["core", "normal", "sensitive"]).optional(),
  user_trigger_only: z.boolean().optional(),
  importance: z.number().int().min(1).max(10).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const ExtractionSchema = z.object({
  items: z.array(MemoryItemSchema).max(20).default([]),
});

function normalizeValueToRecord(v: unknown): Record<string, any> {
  // Your MemoryItem type expects Record<string, any>
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, any>;
  return { value: v }; // wrap primitives: "green" -> { value: "green" }
}

export async function extractMemoryFromText(params: {
  userText: string;
  assistantText?: string;
}): Promise<MemoryItem[]> {
  const { userText, assistantText } = params;

  const system = `
You extract stable, user-affirmed memory for a friend-like AI.

Return STRICT JSON with this shape:
{
  "items": [
    {
      "key": "preferences.color",
      "value": { "value": "green" },
      "tier": "normal",
      "user_trigger_only": false,
      "importance": 6,
      "confidence": 0.9
    }
  ]
}

Rules:
- Do not invent.
- If value is a primitive, wrap it as { "value": <primitive> }.
- If sensitive (diagnoses/trauma/self-harm/medical/substance use/sex): tier="sensitive" and user_trigger_only=true.
- If uncertain, omit the item.
Return JSON only.
`.trim();

  const user = `
USER:
${userText}
ASSISTANT:
${assistantText ?? "(none)"}
Return JSON only.
`.trim();

  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-5";
  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = resp.choices[0]?.message?.content ?? "{}";

  let parsed: z.infer<typeof ExtractionSchema>;
  try {
    parsed = ExtractionSchema.parse(JSON.parse(raw));
  } catch (e) {
    console.warn("Memory extraction parse failed. raw=", raw);
    return [];
  }

  return (parsed.items ?? []).map((it) => {
    const lk = it.key.toLowerCase();
    const isSensitive = SENSITIVE_CATEGORIES.some((c) => lk.includes(c));

    const tier =
      isSensitive ? "sensitive" : (it.tier ?? "normal");

    const user_trigger_only =
      isSensitive ? true : (it.user_trigger_only ?? false);

    const importance = it.importance ?? (tier === "core" ? 9 : 6);
    const confidence = it.confidence ?? 0.9;

    return {
      key: it.key,
      value: normalizeValueToRecord(it.value),
      tier,
      user_trigger_only,
      importance,
      confidence,
    };
  });
}
