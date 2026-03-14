import path from "node:path";
import fs from "node:fs";
import { globSync } from "glob";
import { createClient } from "@supabase/supabase-js";
import { consolidateMemoryItems } from "@/lib/memory/consolidate";
import { streamConversationsFile, parseConversationObject, NormalizedTurn } from "./parseChatGPT";
import { extractMemoryFromText } from "@/lib/memory/extractor";
import { upsertMemoryItems } from "@/lib/memory/store";

type AnyObj = Record<string, any>;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const extractionConcurrency = Number(process.env.IMPORT_EXTRACTION_CONCURRENCY ?? 3);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    () => runWorker()
  );

  await Promise.all(workers);
  return results;
}

const CHECKPOINT_FILE = path.join(process.cwd(), ".import-checkpoint.json");

function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveCheckpoint(data: any) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
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

  const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (projectId) await ensureProjectRow(supabase, projectId);

  const checkpoint = loadCheckpoint();

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

      if (checkpoint && convoCount <= checkpoint.convoCount) {
        return;
      }

      const turns = parseConversationObject(convoObj);
      if (!turns.length) return;

      const chunks = chunkTurnsByCount(turns, turnsPerChunk);

      let localChunkIndex = 0;

      const chunkResults = await mapWithConcurrency(
        chunks,
        extractionConcurrency,
        async (ch, index) => {
          const items = await withTimeout(
            extractMemoryFromText({ transcript: ch.transcript }),
            300000,
            `extractMemoryFromText chunk ${index + 1}`
          );

          return {
            index,
            items,
          };
        }
      );

      const conversationCandidates: any[] = [];

      for (const result of chunkResults) {
        localChunkIndex = result.index + 1;
        chunkCount++;

        const items = result.items ?? [];
        if (items.length) {
          const stamped = items.map((it) => ({
            ...it,
            value: ensureObjectValue((it as any).value),
            source: "chatgpt_import",
            source_conversation_id: String(convoObj?.conversation_id ?? convoObj?.id ?? ""),
          }));

          extractedCount += stamped.length;
          conversationCandidates.push(...stamped);
        }

        saveCheckpoint({
          convoCount,
          chunkIndex: localChunkIndex,
        });

        if (chunkCount % 50 === 0) {
          console.log(
            `[import] progress convos=${convoCount} chunks=${chunkCount} extracted_items=${extractedCount}`
          );
        }
      }

      const consolidated = consolidateMemoryItems(conversationCandidates, {
        minConfidence: 0.6,
        minImportance: 4,
        maxItems: 18,
      });

      if (!dryRun && consolidated.length) {
        const globals = consolidated.filter((x) => x.scope === "global");
        const locals = consolidated.filter((x) => x.scope !== "global");

        if (globals.length) {
          const targetUser = globalUserId ?? userId;
          await withTimeout(
            upsertMemoryItems(targetUser, globals as any, projectId ?? undefined),
            120000,
            "upsertMemoryItems globals"
          );
        }

        if (locals.length) {
          await withTimeout(
            upsertMemoryItems(userId, locals as any, projectId ?? undefined),
            120000,
            "upsertMemoryItems locals"
          );
        }
      }

      if (convoCount % 10 === 0) {
        console.log(
          `[import] convo ${convoCount} complete candidates=${conversationCandidates.length} consolidated=${consolidated.length}`
        );
      }
    });
  }

  console.log(
    `[import] done. convos=${convoCount} chunks=${chunkCount} extracted_items=${extractedCount} dryRun=${dryRun}`
  );

  if (fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
  }
}