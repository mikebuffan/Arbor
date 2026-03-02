import { z } from "zod";
import { openai } from "@/lib/providers/openai";
import { SENSITIVE_CATEGORIES } from "@/lib/memory/rules";
import type { MemoryItem } from "@/lib/memory/types";
import { logMemoryEvent } from "@/lib/memory/logger";

const ValueSchema = z.union([
  z.record(z.string(), z.any()),
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const ScopeSchema = z.enum(["conversation", "project", "global"]).optional().default("conversation");

const MemoryItemSchema = z.object({
  key: z.string().min(3),
  value: ValueSchema,
  tier: z.enum(["core", "normal", "sensitive"]).optional().default("normal"),
  scope: ScopeSchema,
  user_trigger_only: z.boolean().optional().default(false),
  importance: z.number().int().min(1).max(10).optional().default(5),
  confidence: z.number().min(0).max(1).optional().default(0.85),
});

const ExtractionSchema = z.object({
  items: z.array(MemoryItemSchema).max(80).default([]),
});

function normalizeValueToRecord(v: any): Record<string, any> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return { value: v };
}

function stripCodeFences(s: string) {
  return s
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

function extractFirstJsonObject(s: string): string | null {
  const text = stripCodeFences(s);
  let inString = false;
  let escape = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    } else {
      if (ch === '"') {
        inString = true;
        continue;
      }
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

export async function extractMemoryFromText(params: {
  transcript?: string;        
  userText?: string;          
  assistantText?: string;     
}): Promise<MemoryItem[]> {
  const transcript =
    params.transcript ??
    `USER:\n${params.userText ?? ""}\n\nASSISTANT:\n${params.assistantText ?? ""}`.trim();

  if (/i\s+meant|correction|let\s+me\s+clarify/i.test(transcript)) {
    await logMemoryEvent("correction_detected", { text: transcript.slice(0, 5000) });
  }

  const system = `
You extract stable, user-affirmed memory for an AI companion.

GOAL:
- Extract durable facts/preferences/projects/constraints that will remain useful later.

SCOPING:
- scope="conversation": personal facts, preferences, ongoing projects, boundaries.
- scope="global": instructions/rules about how the assistant should behave (persona, tone, safety rules, style constraints).
- scope="project": facts that are about a shared project (e.g. Arbor app architecture), not the user's personal life.

STRICT RULES:
- Do not invent.
- Do not infer demographics unless explicitly stated by the user.
- Do not store tool/system chatter. Ignore "Processing image", system boilerplate, and tool call JSON unless the user explicitly endorsed it as a preference.
- Prefer fewer, higher-signal items. Avoid duplicates.

SENSITIVE:
- If it's sensitive (diagnoses, trauma, self-harm, medical, substance use, sex), store only if user-stated and stable,
  and mark tier="sensitive" and user_trigger_only=true.

OUTPUT:
Return JSON only with shape:
{
  "items": [
    {
      "key": "preferences.brand.color.primary",
      "value": { "value": "vivid fuchsia" },
      "tier": "normal",
      "scope": "conversation",
      "user_trigger_only": false,
      "importance": 6,
      "confidence": 0.9
    }
  ]
}
`.trim();

  const user = `
TRANSCRIPT (ordered):
${transcript}

Return JSON only.
`.trim();

  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-5";

  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" } as any,
  });

  const raw = resp.choices[0]?.message?.content ?? "{}";

  let jsonText = extractFirstJsonObject(raw) ?? stripCodeFences(raw);
  let parsed: z.infer<typeof ExtractionSchema>;

  try {
    parsed = ExtractionSchema.parse(JSON.parse(jsonText));
  } catch {
    console.warn("Memory extraction parse failed. raw=", raw);
    return [];
  }

  return parsed.items.map((it) => {
    const lk = it.key.toLowerCase();
    const isSensitive = SENSITIVE_CATEGORIES.some((c) => lk.includes(c));

    const normalized: MemoryItem = {
      ...it,
      value: normalizeValueToRecord(it.value),
    } as any;

    if (isSensitive || normalized.tier === "sensitive") {
      return { ...normalized, tier: "sensitive", user_trigger_only: true };
    }
    return normalized;
  });
}