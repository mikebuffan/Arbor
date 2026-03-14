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
  if (debug) console.log(`[import:stream] parseChatGPT.ts LOADED (stream-v6)`);

  const stream = fs.createReadStream(filePath, { encoding: "utf8" });

  let inString = false;
  let escape = false;

  let sawStart = false;
  let mode: "unknown" | "array" | "object" = "unknown";

  let inTopLevelArray = false;
  let capturing = false;
  let braceDepth = 0;
  let objBuf = "";

  let emitted = 0;
  let parseErrors = 0;
  let chars = 0;
  let sawTopArray = false;
  let sawFirstObjectStart = false;

  function isWhitespace(ch: string) {
    return ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
  }

  for await (const chunk of stream) {
    chars += chunk.length;

    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];

      if (!sawStart && ch === "\ufeff") continue;

      if (!sawStart) {
        if (isWhitespace(ch)) continue;
        sawStart = true;

        if (ch === "[") {
          mode = "array";
          inTopLevelArray = true;
          sawTopArray = true;
          if (debug) console.log(`[import:stream] saw '[' (top array start)`);
          continue;
        }

        if (ch === "{") {
          mode = "object";
          capturing = true;
          braceDepth = 1;
          objBuf = "{";
          if (debug && !sawFirstObjectStart) {
            console.log(`[import:stream] saw '{' (first object start)`);
            sawFirstObjectStart = true;
          }
          continue;
        }

        throw new Error(`Unexpected JSON start char "${ch}" in ${filePath}`);
      }

      if (inString) {
        if (capturing) objBuf += ch;

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
      } else if (ch === '"') {
        inString = true;
        if (capturing) objBuf += ch;
        continue;
      }

      if (mode === "array") {
        if (!capturing) {
          if (isWhitespace(ch) || ch === ",") continue;

          if (ch === "{") {
            capturing = true;
            braceDepth = 1;
            objBuf = "{";

            if (debug && !sawFirstObjectStart) {
              console.log(`[import:stream] saw '{' (first object start)`);
              sawFirstObjectStart = true;
            }
            continue;
          }

          if (ch === "]") {
            inTopLevelArray = false;
            if (debug) {
              console.log(
                `[import:stream] finished file=${filePath} emitted=${emitted} parseErrors=${parseErrors}`
              );
            }
            return;
          }

          continue;
        }

        objBuf += ch;

        if (ch === "{") {
          braceDepth += 1;
          continue;
        }

        if (ch === "}") {
          braceDepth -= 1;

          if (braceDepth === 0) {
            let parsed: AnyObj | null = null;

            try {
              parsed = JSON.parse(objBuf) as AnyObj;
            } catch (err) {
              parseErrors++;

              if (debug && parseErrors <= 3) {
                console.log("[import:stream] parse error preview len=", objBuf.length);
                console.log("[import:stream] parse error head:");
                console.log(objBuf.slice(0, 300));
                console.log("[import:stream] parse error tail:");
                console.log(objBuf.slice(-300));
              }

              capturing = false;
              objBuf = "";
              continue;
            }

            emitted++;
            capturing = false;
            objBuf = "";

            await onConversation(parsed);
          }
          continue;
        }

        continue;
      }

      if (mode === "object") {
        if (!capturing) {
          if (ch === "{") {
            capturing = true;
            braceDepth = 1;
            objBuf = "{";
          }
          continue;
        }

        objBuf += ch;

        if (ch === "{") {
          braceDepth += 1;
        } else if (ch === "}") {
          braceDepth -= 1;

          if (braceDepth === 0) {
            let parsed: AnyObj | null = null;

            try {
              parsed = JSON.parse(objBuf) as AnyObj;
            } catch (err) {
              parseErrors++;

              if (debug && parseErrors <= 3) {
                console.log("[import:stream] parse error preview len=", objBuf.length);
                console.log("[import:stream] parse error head:");
                console.log(objBuf.slice(0, 300));
                console.log("[import:stream] parse error tail:");
                console.log(objBuf.slice(-300));
              }

              if (debug) {
                console.log(
                  `[import:stream] finished file=${filePath} emitted=${emitted} parseErrors=${parseErrors}`
                );
              }
              return;
            }

            emitted++;
            await onConversation(parsed);

            if (debug) {
              console.log(
                `[import:stream] finished file=${filePath} emitted=${emitted} parseErrors=${parseErrors}`
              );
            }
            return;
          }
        }
      }
    }
  }

  if (debug) {
    console.log(
      `[import:stream] finished (EOF) file=${filePath} emitted=${emitted} parseErrors=${parseErrors}`
    );
    console.log(
      `[import:stream] EOF stats: chars=${chars} sawTopArray=${sawTopArray} sawFirstObjectStart=${sawFirstObjectStart} capturing=${capturing} braceDepth=${braceDepth} inTopLevelArray=${inTopLevelArray}`
    );
  } else {
    console.log(
      `[import:stream] finished file=${filePath} emitted=${emitted} parseErrors=${parseErrors}`
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