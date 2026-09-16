import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { searchHistoricalHopEvidence, classifyHistoricalEvidence } from "@/lib/memory/patternHopRetrieval";

const Body=z.object({projectId:z.string().uuid(),clue:z.string().min(2).max(4000),limit:z.number().int().min(1).max(50).optional()});

export async function POST(req:Request){
 try{
  const {supabase,userId}=await requireUser(req);
  const parsed=Body.safeParse(await req.json().catch(()=>({})));
  if(!parsed.success) return NextResponse.json({ok:false,error:parsed.error.flatten()},{status:400});
  await assertProjectOwnedByUser(supabase,userId,parsed.data.projectId);
  const rows=await searchHistoricalHopEvidence({supabase,userId,projectId:parsed.data.projectId,clue:parsed.data.clue,limit:parsed.data.limit});
  return NextResponse.json({ok:true,clue:parsed.data.clue,evidence:rows.map(row=>({...row,...classifyHistoricalEvidence(row.role)}))});
 }catch(error){
  return NextResponse.json({ok:false,error:error instanceof Error ? error.message : "pattern_hop_failed"},{status:500});
 }
}
