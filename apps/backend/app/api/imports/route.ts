import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";

const ImportSchema = z.object({
  source: z.string().default("chatgpt"),
  projectId: z.string().uuid().optional(),
  threads: z.array(z.object({
    externalThreadId: z.string().optional(),
    title: z.string().optional(),
    createdAt: z.string().optional(),
    messages: z.array(z.object({
      role: z.enum(["user","assistant","system"]),
      content: z.string().min(1),
      createdAt: z.string().optional(),
    })).min(1),
  })).min(1),
});

export async function POST(req: Request) {
  const { supabase, userId } = await requireUser(req);
  const body = await req.json().catch(() => null);
  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok:false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { source, projectId, threads } = parsed.data;

  const { data: imp, error: eImp } = await supabase
    .from("conversation_imports")
    .insert({
      user_id: userId,
      project_id: projectId ?? null,
      source,
      status: "queued",
      stats: { thread_count: threads.length },
    })
    .select("id")
    .single();

  if (eImp) return NextResponse.json({ ok:false, error: eImp.message }, { status: 500 });

  const importId = imp.id as string;

  const rows = [];
  for (let ti = 0; ti < threads.length; ti++) {
    const t = threads[ti];
    for (let mi = 0; mi < t.messages.length; mi++) {
      const m = t.messages[mi];
      rows.push({
        import_id: importId,
        user_id: userId,
        project_id: projectId ?? null,
        thread_index: ti,
        message_index: mi,
        role: m.role,
        content: m.content,
        created_at: m.createdAt ?? null,
        status: "pending",
      });
    }
  }

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("conversation_import_chunks").insert(slice);
    if (error) {
      await supabase.from("conversation_imports").update({ status: "failed", error: error.message }).eq("id", importId);
      return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
    }
  }

  await supabase.from("system_jobs").insert({
    type: "import_conversations",
    status: "pending",
    payload: { importId },
  });

  return NextResponse.json({ ok:true, importId, queued: true });
}