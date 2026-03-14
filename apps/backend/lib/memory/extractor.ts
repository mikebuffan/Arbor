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

const ScopeSchema = z
  .enum(["conversation", "project", "global"])
  .optional()
  .default("conversation");

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

function sanitizeForJson(input: string): string {
  return String(input ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/\r\n/g, "\n");
}

function normalizeValueToRecord(v: any): Record<string, any> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return { value: v };
}

function stripCodeFences(s: string) {
  return s.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
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
    } else if (ch === '"') {
      inString = true;
      continue;
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

function cleanupJsonText(s: string) {
  return stripCodeFences(s)
    .replace(/^\uFEFF/, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function extractItemsArrayText(s: string): string | null {
  const text = cleanupJsonText(s);
  const itemsKeyIdx = text.indexOf('"items"');
  if (itemsKeyIdx < 0) return null;

  let colonIdx = text.indexOf(":", itemsKeyIdx);
  if (colonIdx < 0) return null;

  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = colonIdx + 1; i < text.length; i++) {
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
    } else if (ch === '"') {
      inString = true;
      continue;
    }

    if (/\s/.test(ch)) continue;
    if (ch === "[") {
      start = i;
      break;
    }
    return null;
  }

  if (start < 0) return null;

  let depth = 0;
  inString = false;
  escape = false;

  for (let i = start; i < text.length; i++) {
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
    } else if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function salvageItemsFromArrayText(arrayText: string): any[] {
  const out: any[] = [];
  let inString = false;
  let escape = false;
  let depth = 0;
  let objStart = -1;

  for (let i = 0; i < arrayText.length; i++) {
    const ch = arrayText[i];

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
    } else if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0 && objStart >= 0) {
        const candidate = arrayText.slice(objStart, i + 1);
        try {
          out.push(JSON.parse(candidate));
        } catch {
        }
        objStart = -1;
      }
    }
  }

  return out;
}

function parseExtractionPayload(raw: string): z.infer<typeof ExtractionSchema> | null {
  const primaryText = extractFirstJsonObject(raw) ?? cleanupJsonText(raw);

  try {
    return ExtractionSchema.parse(JSON.parse(primaryText));
  } catch {
  }

  const itemsArrayText = extractItemsArrayText(raw);
  if (!itemsArrayText) return null;

  const salvaged = salvageItemsFromArrayText(itemsArrayText);
  if (!salvaged.length) return null;

  const validItems: z.infer<typeof MemoryItemSchema>[] = [];
  for (const item of salvaged) {
    const parsed = MemoryItemSchema.safeParse(item);
    if (parsed.success) validItems.push(parsed.data);
  }

  return { items: validItems };
}

export async function extractMemoryFromText(params: {
  transcript?: string;
  userText?: string;
  assistantText?: string;
}): Promise<MemoryItem[]> {
  const transcriptRaw =
    params.transcript ??
    `USER:\n${params.userText ?? ""}\n\nASSISTANT:\n${params.assistantText ?? ""}`.trim();

  const transcript = sanitizeForJson(transcriptRaw);

  if (/i\s+meant|correction|let\s+me\s+clarify/i.test(transcript)) {
    await logMemoryEvent("correction_detected", { text: transcript.slice(0, 5000) });
  }

    const system = sanitizeForJson(`
      You extract stable, user-affirmed memory for an AI companion.

      GOAL:
      - Extract durable facts, preferences, projects, constraints, and instructions that will remain useful later.

      SCOPING:
      - scope="conversation": personal facts, preferences, ongoing projects, boundaries.
      - scope="global": instructions/rules about how the assistant should behave (persona, tone, safety rules, style constraints).
      - scope="project": facts that are about a shared project (e.g. Arbor app architecture), not the user's private life.

      STRICT RULES:
      - Do not invent.
      - Do not infer demographics unless explicitly stated by the user.
      - Do not store tool/system chatter.
      - Ignore "Processing image", system boilerplate, and raw tool-call JSON unless the user explicitly endorsed it as a preference or instruction.
      - Prefer fewer, higher-signal items.
      - Avoid duplicates.
      - If one large complex idea appears, split it into multiple smaller items instead of nesting deeply.

      VALUE RULES:
      - Prefer simple values:
        - string
        - number
        - boolean
        - null
        - or a FLAT object with one level only
      - Do NOT output deeply nested objects.
      - If data is complex (menus, bundles, pricing, lists), split into separate items with narrower keys.
      - Never leave placeholder fields or incomplete JSON.

      SENSITIVE:
      - If content is sensitive (diagnoses, trauma, self-harm, medical, substance use, sex), store only if user-stated and stable.
      - Mark such items as tier="sensitive" and user_trigger_only=true.

      OUTPUT:
      Return JSON ONLY with this exact shape:
      {
        "items": [
          {
            "key": "preferences.brand.color.primary",
            "value": "vivid fuchsia",
            "tier": "normal",
            "scope": "conversation",
            "user_trigger_only": false,
            "importance": 6,
            "confidence": 0.9
          }
        ]
      }

      ADDITIONAL OUTPUT CONSTRAINTS:
      - Every item must contain all 7 fields exactly:
        key, value, tier, scope, user_trigger_only, importance, confidence
      - No comments
      - No markdown
      - No code fences
      - No trailing commas
      - No incomplete objects
      `.trim());

    const user = sanitizeForJson(`
      TRANSCRIPT (ordered):
      ${transcript}
 
      Return JSON only.
      `.trim());

  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-5";

  let resp;
  try {
    resp = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" } as any,
    });
  } catch (err) {
    console.error("[extractMemoryFromText] request failed");
    console.error("[extractMemoryFromText] transcript preview:", transcript.slice(0, 500));
    throw err;
  }

  const raw = resp.choices[0]?.message?.content ?? "{}";
  const parsed = parseExtractionPayload(raw);

  if (!parsed) {
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