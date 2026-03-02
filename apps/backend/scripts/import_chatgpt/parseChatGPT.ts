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
  if (debug) console.log(`[import:stream] parseChatGPT.ts LOADED (stream-v5)`);

  const stream = fs.createReadStream(filePath, { encoding: "utf8" });

  let buf = "";
  let inString = false;
  let escape = false;
  let depth = 0;
  let mode: "unknown" | "array" | "object" = "unknown";
  let capturing = false;
  let objStart = -1;
  let emitted = 0;
  let parseErrors = 0;
  let chars = 0;
  let sawTopArray = false;
  let sawFirstObjectStart = false;

  function firstNonWsCharIndex(s: string) {
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c !== " " && c !== "\n" && c !== "\r" && c !== "\t") return i;
    }
    return -1;
  }

  for await (const chunk of stream) {
    buf += chunk;
    chars += chunk.length;

    if (mode === "unknown") {
      const idx = firstNonWsCharIndex(buf);
      if (idx >= 0) {
        const c = buf[idx];
        if (c === "[") {
          mode = "array";
          if (debug) console.log(`[import:stream] saw '[' (top array start)`);
          sawTopArray = true;
        } else if (c === "{") {
          mode = "object";
        } else {
          throw new Error(`Unexpected JSON start char "${c}" in ${filePath}`);
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

      if (ch === "{") {
        depth += 1;
        if (depth === 1) {
          capturing = true;
          objStart = i;
          if (debug && !sawFirstObjectStart) {
            console.log(`[import:stream] saw '{' (first object start)`);
            sawFirstObjectStart = true;
          }
        }
      } else if (ch === "}") {
        if (depth > 0) depth -= 1;

        if (capturing && depth === 0 && objStart >= 0) {
          const objText = buf.slice(objStart, i + 1);

          let parsed: AnyObj | null = null;
          try {
            parsed = JSON.parse(objText);
          } catch {
            parsed = null;
            parseErrors++;
          }

          if (parsed) {
            emitted++;
            await onConversation(parsed);

            buf = buf.slice(i + 1);
            i = -1;

            capturing = false;
            objStart = -1;

            if (mode === "object") return;
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
    console.log(
      `[import:stream] EOF stats: chars=${chars} sawTopArray=${sawTopArray} sawFirstObjectStart=${sawFirstObjectStart} capturing=${capturing} braceDepth=${depth}`
    );
  } else {
    console.log(`[import:stream] finished file=${filePath} emitted=${emitted} parseErrors=${parseErrors}`);
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

    if (role === "tool" || role === "system" || role === "unknown") continue;

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