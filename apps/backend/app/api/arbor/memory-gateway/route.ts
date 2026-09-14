import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import {
  assertConversationOwnedByUser,
  assertProjectOwnedByUser,
} from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";
import {
  buildArborMemoryGatewaySnapshot,
} from "@/lib/arbor/memoryGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string().uuid(),
  conversationId: z.string().uuid().nullable().optional(),
  query: z.string().max(4000).default(""),
});

export async function POST(req: Request) {
  try {
    const { userId, supabase } = await requireUser(req);
    const body = Body.parse(await req.json());

    await assertProjectOwnedByUser(
      supabase,
      userId,
      body.projectId,
    );

    if (body.conversationId) {
      await assertConversationOwnedByUser({
        supabase,
        userId,
        conversationId: body.conversationId,
        projectId: body.projectId,
      });
    }

    const snapshot =
      await buildArborMemoryGatewaySnapshot({
        supabase,
        userId,
        projectId: body.projectId,
        conversationId: body.conversationId ?? null,
        query: body.query,
      });

    return NextResponse.json({
      ok: true,
      snapshot,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "invalid_request" },
        { status: 400 },
      );
    }

    return routeErrorResponse(error);
  }
}
