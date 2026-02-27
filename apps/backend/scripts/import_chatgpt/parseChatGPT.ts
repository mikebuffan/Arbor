import fs from "node:fs";
import path from "node:path";

type AnyObj = Record<string, any>;

export type NormalizedTurn = {
  source: "chatgpt";
  sourceConversationId: string;
  sourceMessageId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string | null;
};

export async function streamConversationsFile(
  filePath: string,
  onConversation: (convoObj: AnyObj) => Promise<void> | void
) {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });

  let buf = "";
  let inString = false;
  let escape = false;
  let depth = 0;
  let startedArray = false;
  let capturing = false;
  let objStart = -1;

  for await (const chunk of stream) {
    buf += chunk;

    for (let i = 0; i < buf.length; i++) {
      const ch = buf[i];

      if (!startedArray) {
        if (ch === "[") startedArray = true;
        continue;
      }

      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      } else {
        if (ch === '"') {
          inString = true;
          continue;
        }
      }

      if (ch === "{") {
        depth += 1;
        if (depth === 1) {
          capturing = true;
          objStart = i;
        }
      } else if (ch === "}") {
        if (depth > 0) depth -= 1;

        if (capturing && depth === 0 && objStart >= 0) {
          const objText = buf.slice(objStart, i + 1);
          let convoObj: AnyObj | null = null;

          try {
            convoObj = JSON.parse(objText);
          } catch (e) {
            convoObj = null;
          }

          if (convoObj) {
            await onConversation(convoObj);

            buf = buf.slice(i + 1);
            i = -1;

            capturing = false;
            objStart = -1;
          }
        }
      } else if (ch === "]") {
        return;
      }
    }

    if (!capturing && buf.length > 1024 * 1024) {
      buf = buf.slice(-1024 * 128);
    }
  }
}

function getPartsText(msg: AnyObj): string {
  const parts = msg?.content?.parts;
  if (Array.isArray(parts)) {
    return parts
      .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
      .join("\n")
      .trim();
  }
  const c = msg?.content;
  if (typeof c === "string") return c.trim();
  return "";
}

function roleFromAuthor(msg: AnyObj): "user" | "assistant" | "system" | "tool" | "unknown" {
  const r = msg?.author?.role;
  if (r === "user" || r === "assistant" || r === "system" || r === "tool") return r;
  return "unknown";
}

function unixSecondsToIso(sec: any): string | null {
  const n = typeof sec === "number" ? sec : Number(sec);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

export function turnsFromMapping(convoObj: AnyObj): NormalizedTurn[] {
  const mapping: AnyObj = convoObj?.mapping ?? {};
  const convoId = String(convoObj?.conversation_id ?? convoObj?.id ?? "");

  const current = String(convoObj?.current_node ?? "");
  if (!current || !mapping[current]) return [];

  const chainIds: string[] = [];
  const seen = new Set<string>();

  let cursor: string | null = current;

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    chainIds.push(cursor);
    const parent: unknown = mapping[cursor]?.parent;
    cursor = parent ? String(parent) : null;
  }

  chainIds.reverse();

  const turns: NormalizedTurn[] = [];

  for (const nodeId of chainIds) {
    const node = mapping[nodeId];
    const msg = node?.message;
    if (!msg) continue;

    const role = roleFromAuthor(msg);
    const text = getPartsText(msg);
    if (!text) continue;

    if (role === "tool" || role === "unknown") continue;

    turns.push({
      source: "chatgpt",
      sourceConversationId: convoId,
      sourceMessageId: String(msg?.id ?? nodeId),
      role,
      content: text,
      createdAt: unixSecondsToIso(msg?.create_time),
    });
  }

  return turns;
}

export function parseConversationObject(convoObj: AnyObj): NormalizedTurn[] {
  return turnsFromMapping(convoObj);
}