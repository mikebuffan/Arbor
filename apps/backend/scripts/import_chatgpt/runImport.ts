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

function chunkTurnsByCount(turns: NormalizedTurn[], turnsPerChunk = 10) {
  const chunks: Array<{ transcript: string; turns: NormalizedTurn[] }> = [];
  let buf: NormalizedTurn[] = [];

  for (const t of turns) {
    buf.push(t);
    if (buf.length >= turnsPerChunk) {
      chunks.push({ transcript: formatTranscript(buf), turns: buf });
      buf = [];
    }
  }

  if (buf.length) chunks.push({ transcript: formatTranscript(buf), turns: buf });
  return chunks;
}

function formatTranscript(turns: NormalizedTurn[]) {
  return turns
    .map((t) => {
      const header = `${t.role.toUpperCase()}${t.createdAt ? ` @ ${t.createdAt}` : ""}:`;
      return `${header}\n${t.content}`.trim();
    })
    .join("\n\n---\n\n");
}

/**
 * NOTE:
 * In this repo, Supabase generated types sometimes do not include "projects",
 * causing `.from("projects")` to type to `never` and explode in TS.
 *
 * This helper intentionally loosens typing for the bootstrap "projects" row creation.
 * Runtime behavior is unchanged.
 */
async function ensureProjectRow(supabase: any, projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (data?.id) return;

  const { error: insErr } = await supabase.from("projects").insert({
    id: projectId,
    name: "Imported Project",
    created_at: new Date().toISOString(),
  });

  if (insErr) throw insErr;
  console.log(`[import] created missing project row: ${projectId}`);
}

export async function runImport(params: {
  rootDir: string;
  userId: string;
  projectId?: string | null;
  turnsPerChunk?: number;
  dryRun?: boolean;
  globalUserId?: string | null;
}) {
  const {
    rootDir,
    userId,
    projectId,
    turnsPerChunk = 10,
    dryRun = false,
    globalUserId = process.env.ARBOR_GLOBAL_USER_ID ?? null,
  } = params;

  // Cast to `any` to avoid type mismatches between generated Database typings
  // and the CLI script. This is safe for runtime and keeps the script usable.
  const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (projectId) {
    await ensureProjectRow(supabase, projectId);
  }

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

      const chunks = chunkTurnsByCount(turns, turnsPerChunk);

      for (const ch of chunks) {
        chunkCount++;

        const items = await extractMemoryFromText({ transcript: ch.transcript });
        if (!items.length) continue;

        const stamped = items.map((it) => ({
          ...it,
          value: ensureObjectValue((it as any).value),
          source: "chatgpt_import",
          source_conversation_id: String(convoObj?.conversation_id ?? convoObj?.id ?? ""),
        }));

        extractedCount += stamped.length;

        if (dryRun) continue;

        // Scope routing:
        // - "global" items can go to a special global user id (persona layer)
        // - all other items stay on the importing user
        const globals = stamped.filter((x) => x.scope === "global");
        const locals = stamped.filter((x) => x.scope !== "global");

        if (globals.length) {
          const targetUser = globalUserId ?? userId;
          await upsertMemoryItems(targetUser, globals as any, projectId ?? undefined);
        }

        if (locals.length) {
          await upsertMemoryItems(userId, locals as any, projectId ?? undefined);
        }

        if (convoCount % 25 === 0) {
          console.log(
            `[import] progress convos=${convoCount} chunks=${chunkCount} extracted_items=${extractedCount} dryRun=${dryRun}`
          );
        }
      }
    });
  }

  console.log(
    `[import] done. convos=${convoCount} chunks=${chunkCount} extracted_items=${extractedCount} dryRun=${dryRun}`
  );
}