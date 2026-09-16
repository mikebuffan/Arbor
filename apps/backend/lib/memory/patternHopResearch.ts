import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueHop, finishBranch, objectiveComplete, rankEvidence, takeNextHop, type PatternHopEdge, type PatternHopEvidence, type PatternHopState } from "@/lib/memory/patternHop";
import { buildPathStep, projectPatternHopForRuntime, selectNextHopCandidates, type PatternHopCandidate, type PatternHopPathStep } from "@/lib/memory/patternHopEngine";
import { classifyHistoricalEvidence, searchHistoricalHopEvidence, searchMemoryHopEvidence, searchTimelineHopEvidence } from "@/lib/memory/patternHopRetrieval";
import { patternHopBranchClue } from "@/lib/memory/patternHopClues";
import { createPatternHopRun, loadPatternHopRun, persistPatternHopEdges, persistPatternHopEvidence, savePatternHopRun } from "@/lib/memory/patternHopStore";

export const DEFAULT_PATTERN_HOP_BRANCHES = ["direct_matches","neighboring_concepts","people_entities","terminology_changes","causal_predecessors","consequences","retrospective_references","chronology_anchors","implementation_architecture","behavioral_results","contradictions"] as const;

function toEvidence(row: Awaited<ReturnType<typeof searchHistoricalHopEvidence>>[number], branch: string): PatternHopEvidence {
  const classification = classifyHistoricalEvidence(row.role, branch.includes("retrospective_references"), row.content);
  return { id:row.id, source:row.source, sourceThreadId:row.sourceThreadId, sourceMessageId:row.sourceMessageId, speaker:row.role, evidenceType:classification.evidenceType, content:row.content, occurredAt:row.occurredAt, confidence:Math.max(0,Math.min(1,row.similarity ?? 0.5)), epistemicStatus:classification.epistemicStatus };
}

export async function runPatternHopResearch(params:{supabase:SupabaseClient;userId:string;projectId:string;conversationId?:string|null;seed:string;objective?:string;maxDepth?:number;maxHops?:number;runId?:string}) {
  let run = params.runId ? await loadPatternHopRun({supabase:params.supabase,userId:params.userId,projectId:params.projectId,runId:params.runId}) : null;
  if (params.runId && !run) throw new Error("pattern_hop_run_not_found");
  if (!run) {
    run = await createPatternHopRun({supabase:params.supabase,userId:params.userId,projectId:params.projectId,conversationId:params.conversationId,objective:params.objective ?? "Pattern-hop research: "+params.seed,seed:{clue:params.seed},maxDepth:params.maxDepth});
    for (const branch of DEFAULT_PATTERN_HOP_BRANCHES) run.state=enqueueHop(run.state,{evidenceId:"seed",clue:patternHopBranchClue(branch,params.seed),depth:0,branch});
    await savePatternHopRun({supabase:params.supabase,runId:run.id,userId:params.userId,projectId:params.projectId,state:run.state});
  }

  let state:PatternHopState=run.state;
  const found:PatternHopEvidence[]=[];
  const edges:PatternHopEdge[]=[];
  const path:PatternHopPathStep[]=[];
  const evidenceById=new Map<string,PatternHopEvidence>();
  const visitedEvidenceIds=new Set<string>();
  const maxHops=Math.max(1,Math.min(params.maxHops ?? 24,100));

  for(let i=0;i<maxHops && state.status==="active";i+=1){
    const nextResult=takeNextHop(state); state=nextResult.state; const next=nextResult.next; if(!next) break;
    const parent=next.evidenceId==="seed" ? null : evidenceById.get(next.evidenceId) ?? null;
    let rows:Awaited<ReturnType<typeof searchHistoricalHopEvidence>>=[];
    try { rows=await searchHistoricalHopEvidence({supabase:params.supabase,userId:params.userId,projectId:params.projectId,clue:next.clue,limit:8}); }
    catch(error){ state={...state,status:"blocked",blocker:error instanceof Error?error.message:"pattern_hop_retrieval_failed"}; break; }

    const historical=rows.filter(r=>(r.similarity ?? 0)>=0.35).map(r=>toEvidence(r,next.branch));
    let memory:PatternHopEvidence[]=[]; let timeline:PatternHopEvidence[]=[];
    try { [memory,timeline]=await Promise.all([
      searchMemoryHopEvidence({supabase:params.supabase,userId:params.userId,projectId:params.projectId,clue:next.clue,limit:5}),
      searchTimelineHopEvidence({supabase:params.supabase,userId:params.userId,projectId:params.projectId,clue:next.clue,limit:5}),
    ]); } catch { memory=[]; timeline=[]; }

    const candidates:PatternHopCandidate[]=[
      ...historical.map(evidence=>({evidence,retrievalScore:evidence.confidence,retrievalMethod:"historical_embedding"})),
      ...memory.map(evidence=>({evidence,retrievalScore:evidence.confidence,retrievalMethod:"memory_lexical"})),
      ...timeline.map(evidence=>({evidence,retrievalScore:evidence.confidence,retrievalMethod:"timeline_lexical"})),
    ];
    const selected=selectNextHopCandidates({parent,candidates,visitedEvidenceIds,minScore:0.42,branchLimit:3});
    if(!selected.length){ state=finishBranch(state,next.branch,false); }
    else {
      state=finishBranch(state,next.branch,true);
      for(const candidate of selected){
        const evidence=candidate.evidence; visitedEvidenceIds.add(evidence.id); evidenceById.set(evidence.id,evidence);
        if(!found.some(x=>x.id===evidence.id)) found.push(evidence);
        const step=buildPathStep({candidate,parentEvidenceId:next.evidenceId==="seed"?null:next.evidenceId,depth:next.depth}); path.push(step);
        edges.push({fromEvidenceId:step.parentEvidenceId,toEvidenceId:evidence.id,originatingClue:next.clue,relationship:candidate.relationship,hopDepth:next.depth,confidence:candidate.score,epistemicStatus:evidence.epistemicStatus==="direct"?"direct":evidence.epistemicStatus==="hypothesis"?"hypothesis":"derived",rationale:candidate.relationshipReason});
        if(next.depth+1<=state.maxDepth){
          for(const branch of ["neighboring_concepts","terminology_changes","causal_predecessors","consequences","retrospective_references","contradictions"]){
            state=enqueueHop(state,{evidenceId:evidence.id,clue:patternHopBranchClue(branch,params.seed,evidence.content),depth:next.depth+1,branch:next.branch+">"+branch});
          }
        }
      }
    }
    await savePatternHopRun({supabase:params.supabase,runId:run.id,userId:params.userId,projectId:params.projectId,state});
  }

  const idMap=await persistPatternHopEvidence({supabase:params.supabase,runId:run.id,userId:params.userId,projectId:params.projectId,evidence:found});
  await persistPatternHopEdges({supabase:params.supabase,runId:run.id,idMap,edges});
  const rootBranches=[...DEFAULT_PATTERN_HOP_BRANCHES];
  if(state.status==="active" && objectiveComplete(state,rootBranches)) state={...state,status:"complete"};
  if(state.status==="active" && state.frontier.length===0) state={...state,status:"exhausted"};
  const runtimeProjection=projectPatternHopForRuntime({evidence:found,path,maxItems:8});
  const verificationState={rootBranches,foundEvidence:found.length,edgeCount:edges.length,pathSteps:path.length,frontierRemaining:state.frontier.length,completedBranches:state.completedBranches.length,exhaustedBranches:state.exhaustedBranches.length,runtimeProjectionCount:runtimeProjection.length};
  await savePatternHopRun({supabase:params.supabase,runId:run.id,userId:params.userId,projectId:params.projectId,state,verificationState});
  return {runId:run.id,status:state.status,blocker:state.blocker ?? null,state,evidence:rankEvidence(found),edges,path,runtimeProjection,verificationState};
}
