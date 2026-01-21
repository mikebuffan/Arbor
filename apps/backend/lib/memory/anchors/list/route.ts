import { NextRequest, NextResponse } from "next/server";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { getProjectAnchors } from "@/lib/memory/anchors";

export async function GET(req: NextRequest) {
  const supabase = supabaseFromAuthHeader(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "missing projectId" }, { status: 400 });
  }

  const anchors = await getProjectAnchors({
    authedUserId: data.user.id,
    projectId,
  });

  return NextResponse.json({ ok: true, anchors });
}
