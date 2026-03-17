import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { correctMemoryItem } from "@/lib/memory/store";

const Body = z.object({
  correctionKey: z.string().min(1),
  correctedValue: z.any(),
  projectId: z.string().uuid().nullable().optional(),
  scope: z.any().optional(),
  conversationId: z.any().optional(),
});

export async function POST(req: Request) {
  const supabase = supabaseFromAuthHeader(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await correctMemoryItem({
    authedUserId: data.user.id,
    key: parsed.data.correctionKey.trim(),
    newValue: parsed.data.correctedValue,
    projectId: parsed.data.projectId ?? null,
  });

  return NextResponse.json({ ok: true, ...result });
}