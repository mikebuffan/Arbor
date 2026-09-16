import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { runPatternHopResearch } from "@/lib/memory/patternHopResearch";

const Body = z.object({
  projectId: z.string().uuid(),
  clue: z.string().min(2).max(4000),
  objective: z.string().min(2).max(4000).optional(),
  runId: z.string().uuid().optional(),
  maxDepth: z.number().int().min(1).max(12).optional(),
  maxHops: z.number().int().min(1).max(100).optional(),
  conversationId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUser(req);
    const parsed = Body.safeParse(
      await req.json().catch(() => ({})),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await assertProjectOwnedByUser(
      supabase,
      userId,
      parsed.data.projectId,
    );

    const result = await runPatternHopResearch({
      supabase,
      userId,
      projectId: parsed.data.projectId,
      conversationId: parsed.data.conversationId ?? null,
      seed: parsed.data.clue,
      objective: parsed.data.objective,
      runId: parsed.data.runId,
      maxDepth: parsed.data.maxDepth,
      maxHops: parsed.data.maxHops,
    });

    return NextResponse.json({
      ok: true,
      clue: parsed.data.clue,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "pattern_hop_failed",
      },
      { status: 500 },
    );
  }
}
