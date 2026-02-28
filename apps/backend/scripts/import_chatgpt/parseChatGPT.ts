import fs from "node:fs";

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
  const debug = process.env.IMPORT_DEBUG === "1";
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });

  let buf = "";

  let inString = false;
  let escape = false;

  let inTopArray = false;

  let capturing = false;
  let braceDepth = 0;
  let objStart = -1;

  let emitted = 0;
  let parseErrors = 0;

  function firstNonWsCharIndex(s: string) {
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "\ufeff") continue;
      if (c !== " " && c !== "\n" && c !== "\r" && c !== "\t") return i;
    }
    return -1;
  }

  for await (const chunk of stream) {
    buf += chunk;

    if (!inTopArray) {
      const idx = firstNonWsCharIndex(buf);
      if (idx >= 0) {
        const start = buf[idx];
        if (start !== "[") {
          throw new Error(
            `Expected conversations export to start with "[" but found "${start}" in ${filePath}`
          );
        }
      }
    }

    for (let i = 0; i < buf.length; i++) {
      const ch = buf[i];

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

      if (!inTopArray) {
        if (ch === "[") {
          inTopArray = true;
        }
        continue;
      }

      if (!capturing && ch === "]") {
        if (debug) {
          console.log(
            `[import:stream] finished file=${filePath} emitted=${emitted} parseErrors=${parseErrors}`
          );
        }
        return;
      }

      if (!capturing && ch === "{") {
        capturing = true;
        braceDepth = 1;
        objStart = i;
        continue;
      }

      if (capturing) {
        if (ch === "{") {
          braceDepth += 1;
        } else if (ch === "}") {
          braceDepth -= 1;

          if (braceDepth === 0 && objStart >= 0) {
            const objText = buf.slice(objStart, i + 1);

            try {
              const parsed = JSON.parse(objText) as AnyObj;
              emitted += 1;

              await onConversation(parsed);

              if (debug && emitted % 100 === 0) {
                console.log(
                  `[import:stream] emitted=${emitted} parseErrors=${parseErrors} file=${filePath}`
                );
              }
            } catch {
              parseErrors += 1;
            }

            buf = buf.slice(i + 1);
            i = -1;

            capturing = false;
            objStart = -1;
            braceDepth = 0;
          }
        }
      }
    }

    if (!capturing && buf.length > 1024 * 1024) {
      buf = buf.slice(-1024 * 128);
    }
  }

  if (debug) {
    console.log(
      `[import:stream] finished (EOF) file=${filePath} emitted=${emitted} parseErrors=${parseErrors}`
    );
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

function roleFromAuthor(
  msg: AnyObj
): "user" | "assistant" | "system" | "tool" | "unknown" {
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