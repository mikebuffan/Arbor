import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import {
  appendEditorialRecord, editorialRecordTypes, listEditorialState,
  registerChapter, registerManuscript, saveEditorialCheckpoint,
} from "@/lib/arbor/annabelle/editorial";

const Scope = z.object({ projectId: z.string().uuid(), manuscriptId: z.string().uuid().optional() });
const Action = z.discriminatedUnion("action", [
  z.object({ action:z.literal("register_manuscript"), projectId:z.string().uuid(), title:z.string().min(1).max(500), sourceLabel:z.string().min(1).max(500), sourceSha256:z.string().min(32).max(128), status:z.enum(["reference","canonical","superseded","archived"]).optional(), metadata:z.record(z.string(),z.unknown()).optional() }),
  z.object({ action:z.literal("register_chapter"), projectId:z.string().uuid(), manuscriptId:z.string().uuid(), chapterNumber:z.number().int().min(1).max(10000), label:z.string().max(500).optional(), sourceSha256:z.string().min(32).max(128), wordCount:z.number().int().min(0), sourceLocator:z.record(z.string(),z.unknown()).optional(), metadata:z.record(z.string(),z.unknown()).optional() }),
  z.object({ action:z.literal("append_record"), projectId:z.string().uuid(), manuscriptId:z.string().uuid(), chapterId:z.string().uuid().optional(), recordType:z.enum(editorialRecordTypes), subject:z.string().max(500).optional(), content:z.record(z.string(),z.unknown()), confidence:z.number().min(0).max(1), epistemicStatus:z.enum(["observed","probable","confirmed","hypothesis","contradictory","rejected"]), sourceLocator:z.record(z.string(),z.unknown()).optional(), sourceSha256:z.string().max(128).optional(), supersedesId:z.string().uuid().optional() }),
  z.object({ action:z.literal("checkpoint"), projectId:z.string().uuid(), manuscriptId:z.string().uuid(), passType:z.enum(["diagnostic","continuous","editing","proof","voice_integrity"]), chapterNumber:z.number().int().min(0).max(10000), status:z.enum(["ready","in_progress","checkpointed","complete","blocked"]), state:z.record(z.string(),z.unknown()).optional() }),
]);

export async function GET(req: Request) {
  try {
    const { supabase, userId } = await requireUser(req);
    const url = new URL(req.url);
    const scope = Scope.parse({ projectId:url.searchParams.get("projectId"), manuscriptId:url.searchParams.get("manuscriptId") });
    await assertProjectOwnedByUser(supabase,userId,scope.projectId);
    if (!scope.manuscriptId) {
      const { data,error }=await supabase.from("annabelle_manuscripts").select("*").eq("project_id",scope.projectId).order("created_at");
      if(error) throw error; return NextResponse.json({ok:true,manuscripts:data??[]});
    }
    const chapterRaw=url.searchParams.get("chapterNumber");
    const typesRaw=url.searchParams.get("recordTypes");
    const state=await listEditorialState({supabase,projectId:scope.projectId,manuscriptId:scope.manuscriptId,chapterNumber:chapterRaw?Number(chapterRaw):undefined,recordTypes:typesRaw?typesRaw.split(",") as any:undefined,subject:url.searchParams.get("subject")??undefined});
    return NextResponse.json({ok:true,...state});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:"editorial_read_failed"},{status:400}); }
}

export async function POST(req: Request) {
  try {
    const { supabase,userId }=await requireUser(req);
    const body=Action.parse(await req.json());
    await assertProjectOwnedByUser(supabase,userId,body.projectId);
    let result: unknown;
    if(body.action==="register_manuscript") result=await registerManuscript({supabase,userId,...body});
    else if(body.action==="register_chapter") result=await registerChapter({supabase,userId,...body});
    else if(body.action==="append_record") result=await appendEditorialRecord({supabase,userId,...body});
    else result=await saveEditorialCheckpoint({supabase,userId,...body});
    return NextResponse.json({ok:true,result});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:"editorial_write_failed"},{status:400}); }
}
