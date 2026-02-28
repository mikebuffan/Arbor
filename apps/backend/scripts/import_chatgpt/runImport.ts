import path from "node:path";
import { globSync } from "glob";
import { createClient } from "@supabase/supabase-js";

import { streamConversationsFile, parseConversationObject, NormalizedTurn } from "./parseChatGPT";
import { extractMemoryFromText } from "@/lib/memory/extractor";
import { upsertMemoryItems } from "@/lib/memory/store";

type AnyObj = Record<string, any>;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
}

function ensureObjectValue(v: any): Record<string, any> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return { value: v };
}

function chunkTurns(turns: NormalizedTurn[], maxChars = 9000) {
  const chunks: Array<{ userText: string; assistantText: string }> = [];
  let u = "";
  let a = "";

  for (const t of turns) {
    const line = `${t.role}: ${t.content}\n`;
    if (t.role === "user") u += line;
    else if (t.role === "assistant") a += line;

    if (u.length + a.length >= maxChars) {
      chunks.push({ userText: u.trim(), assistantText: a.trim() });
      u = "";
      a = "";
    }
  }

  if (u.trim() || a.trim()) chunks.push({ userText: u.trim(), assistantText: a.trim() });
  return chunks;
}

export async function runImport(params: {
  rootDir: string;
  userId: string;
  projectId?: string | null;
}) {
  const { rootDir, userId, projectId } = params;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const files = globSync("conversations-*.json", {
    cwd: rootDir,
    absolute: true,
    nodir: true,
    windowsPathsNoEscape: true,
  });
  if (!files.length) throw new Error(`No conversations-*.json found in ${rootDir}`);

  let convoCount = 0;
  let chunkCount = 0;
  let extractedCount = 0;

  for (const file of files) {
    console.log(`[import] streaming ${path.basename(file)} ...`);

    await streamConversationsFile(file, async (convoObj: AnyObj) => {
      convoCount++;

      const turns = parseConversationObject(convoObj);
      if (!turns.length) return;

      const chunks = chunkTurns(turns);
      for (const ch of chunks) {
        chunkCount++;

        const items = await extractMemoryFromText({
          userText: ch.userText,
          assistantText: ch.assistantText,
        });

        if (!items.length) continue;
        extractedCount += items.length;

        const stamped = items.map((it) => ({
          ...it,
          value: ensureObjectValue((it as any).value),
          source: "chatgpt_import",
          source_conversation_id: String(convoObj?.conversation_id ?? convoObj?.id ?? ""),
        }));

        await upsertMemoryItems(userId, stamped as any, projectId ?? undefined);

        if (convoCount % 25 === 0) {
          console.log(`[import] progress convos=${convoCount} chunks=${chunkCount} extracted_items=${extractedCount}`);
        }
      }
    });
  }

  console.log(`[import] done. convos=${convoCount} chunks=${chunkCount} extracted_items=${extractedCount}`);
}