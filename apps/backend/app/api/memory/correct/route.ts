import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { applyMemoryCorrection } from "@/lib/memory/applyCorrection";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

const Body = z.object({
  key: z.string().min(1),
  correctedValue: z.any(),
  projectId: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  try {
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
    const projectId = parsed.data.projectId ?? null;

    const result = await applyMemoryCorrection({
      supabase,
      userId,
      projectId,
      key: parsed.data.key,
      correctedValue: parsed.data.correctedValue,
    });

    return NextResponse.json({ ok: true, locked: result.locked });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}
