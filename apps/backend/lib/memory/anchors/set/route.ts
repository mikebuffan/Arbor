import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { setProjectAnchor } from "@/lib/memory/anchors";
import { invalidatePromptCache } from "@/lib/prompt/buildPromptContext";

const Body = z.object({
  projectId: z.string().uuid(),
  memKey: z.string().min(2),
  memValue: z.string().min(1),
  displayText: z.string().min(1).optional(),
  pinned: z.boolean().optional().default(true),
  locked: z.boolean().optional().default(true),
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

  const userId = data.user.id;
  const { projectId, memKey, memValue, displayText, pinned, locked } = parsed.data;

  const result = await setProjectAnchor({
    authedUserId: userId,
    projectId,
    memKey: memKey.trim(),
    memValue: memValue.trim(),
    displayText,
    pinned,
    locked,
  });

  // IMPORTANT: prompt builder caches for 30s in this repo; bust it immediately
  invalidatePromptCache({ authedUserId: userId, projectId });

  return NextResponse.json({ ok: true, result });
}

