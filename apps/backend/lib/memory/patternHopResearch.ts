import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueHop, finishBranch, objectiveComplete, rankEvidence, takeNextHop, type PatternHopEdge, type PatternHopEvidence, type PatternHopState } from "@/lib/memory/patternHop";
import { buildPathStep, projectPatternHopForRuntime, selectNextHopCandidates, type PatternHopCandidate, type PatternHopPathStep, type PatternHopRelationship } from "@/lib/memory/patternHopEngine";
import { classifyHistoricalEvidence, searchHistoricalHopEvidence, searchMemoryHopEvidence, searchTimelineHopEvidence } from "@/lib/memory/patternHopRetrieval";
import { patternHopBranchClue } from "@/lib/memory/patternHopClues";
import { createPatternHopRun, loadPatternHopEdges, loadPatternHopEvidence, loadPatternHopRun, persistPatternHopEdges, persistPatternHopEvidence, savePatternHopRun } from "@/lib/memory/patternHopStore";

export const DEFAULT_PATTERN_HOP_BRANCHES = ["direct_matches","neighboring_concepts","people_entities","terminology_changes","causal_predecessors","consequences","retrospective_references","chronology_anchors","implementation_architecture","behavioral_results","contradictions"] as const;

function toEvidence(row: Awaited<ReturnType<typeof searchHistoricalHopEvidence>>[number], branch: string): PatternHopEvidence {
  const classification = classifyHistoricalEvidence(row.role, branch.includes("retrospective_references"), row.content);
  return { id:row.id, source:row.source, sourceThreadId:row.sourceThreadId, sourceMessageId:row.sourceMessageId, speaker:row.role, evidenceType:classification.evidenceType, content:row.content, occurredAt:row.occurredAt, confidence:Math.max(0,Math.min(1,row.similarity ?? 0.5)), epistemicStatus:classification.epistemicStatus };
}

export async function runPatternHopResearch(params:{supabase:SupabaseClient;userId:string;projectId:string;conversationId?:string|null;seed:string;objective?:string;maxDepth?:number;maxHops?:number;runId?:string}) {
  let run = params.runId ? await loadPatternHopRun({supabase:params.supabase,userId:params.userId,projectId:params.projectId,runId:params.runId}) : null;
  if (params.runId && !run) throw new Error("pattern_hop_run_not_found");
  if (run && (run.seed.clue !== params.seed || (params.maxDepth !== undefined && params.maxDepth !== run.state.maxDepth)))
    throw new Error("pattern_hop_resume_input_mismatch");
  if (!run) {
    run = await createPatternHopRun({supabase:params.supabase,userId:params.userId,projectId:params.projectId,conversationId:params.conversationId,objective:params.objective ?? "Pattern-hop research: "+params.seed,seed:{clue:params.seed},maxDepth:params.maxDepth});
    for (const branch of DEFAULT_PATTERN_HOP_BRANCHES) run.state=enqueueHop(run.state,{evidenceId:"seed",clue:patternHopBranchClue(branch,params.seed),depth:0,branch});
    await savePatternHopRun({supabase:params.supabase,runId:run.id,userId:params.userId,projectId:params.projectId,state:run.state});
  }

  let state:PatternHopState=run.state;
  const found:PatternHopEvidence[]=await loadPatternHopEvidence({
    supabase:params.supabase,
    runId:run.id,
    userId:params.userId,
    projectId:params.projectId,
  });
  const edges:PatternHopEdge[]=await loadPatternHopEdges({
    supabase:params.supabase,
    runId:run.id,
  });
  const evidenceById=new Map<string,PatternHopEvidence>(
    found.map(evidence=>[evidence.id,evidence]),
  );
  // Sources/edges can survive a failed checkpoint. Only edges whose parent
  // retrieval is committed count as visited; replay the rest to rebuild children.
  const visitedEvidenceIds=new Set<string>(edges.filter(edge=>state.visited.some(key=>key.startsWith([edge.fromEvidenceId ?? "seed",edge.originatingClue,edge.hopDepth,""].join("::")))).map(edge=>edge.toEvidenceId));
  const path:PatternHopPathStep[]=edges.flatMap(edge=>{
    const evidence=evidenceById.get(edge.toEvidenceId);
    if(!evidence) return [];
    return [{
      evidenceId:evidence.id,
      parentEvidenceId:edge.fromEvidenceId ?? null,
      depth:edge.hopDepth,
      relationship:edge.relationship as PatternHopRelationship,
      rationale:edge.rationale,
      score:edge.confidence,
      epistemicStatus:evidence.epistemicStatus,
      retrievalMethod:"persisted",
    }];
  });
  const maxHops=Math.max(1,Math.min(params.maxHops ?? 24,100));
  // Resolve restored client IDs once. New sources/edges must be durable before
  // a checkpoint can mark their retrieval visited or enqueue their children.
  const idMap=found.length ? await persistPatternHopEvidence({supabase:params.supabase,runId:run.id,userId:params.userId,projectId:params.projectId,evidence:found}) : new Map<string,string>();

  for(let i=0;i<maxHops && state.status==="active";i+=1){
    const evidenceStart=found.length;
    const edgeStart=edges.length;
    const nextResult=takeNextHop(state); state=nextResult.state; const next=nextResult.next; if(!next) break;
    const parent=next.evidenceId==="seed" ? null : evidenceById.get(next.evidenceId) ?? null;
    let rows:Awaited<ReturnType<typeof searchHistoricalHopEvidence>>=[];
    let memory:PatternHopEvidence[]=[];
    let timeline:PatternHopEvidence[]=[];
    const sourceFailures:string[]=[];

    try {
      rows=await searchHistoricalHopEvidence({
        supabase:params.supabase,userId:params.userId,projectId:params.projectId,clue:next.clue,limit:8
      });
    } catch(error) {
      sourceFailures.push("historical:"+(error instanceof Error?error.message:"failed"));
    }

    try {
      memory=await searchMemoryHopEvidence({
        supabase:params.supabase,userId:params.userId,projectId:params.projectId,clue:next.clue,limit:5
      });
    } catch(error) {
      sourceFailures.push("memory:"+(error instanceof Error?error.message:"failed"));
    }

    try {
      timeline=await searchTimelineHopEvidence({
        supabase:params.supabase,userId:params.userId,projectId:params.projectId,clue:next.clue,limit:5
      });
    } catch(error) {
      sourceFailures.push("timeline:"+(error instanceof Error?error.message:"failed"));
    }

    if(sourceFailures.length===3){
      state={...state,status:"blocked",blocker:"all_pattern_hop_sources_failed:"+sourceFailures.join("|")};
      break;
    }

    const historicalCandidates:PatternHopCandidate[]=rows
      .filter(r=>(r.similarity ?? 0)>=0.35)
      .map(row=>({
        evidence:toEvidence(row,next.branch),
        retrievalScore:Math.max(0,Math.min(1,row.similarity ?? 0.5)),
        retrievalMethod:row.retrievalMethod ?? "historical_hybrid",
      }));

    const candidates:PatternHopCandidate[]=[
      ...historicalCandidates,
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
        const step=buildPathStep({candidate,parentEvidenceId:next.evidenceId==="seed"?null:next.evidenceId,depth:next.depth});
        if(!edges.some(edge=>edge.fromEvidenceId===step.parentEvidenceId && edge.toEvidenceId===evidence.id && edge.relationship===candidate.relationship && edge.hopDepth===next.depth)) {
          path.push(step);
          edges.push({fromEvidenceId:step.parentEvidenceId,toEvidenceId:evidence.id,originatingClue:next.clue,relationship:candidate.relationship,hopDepth:next.depth,confidence:candidate.score,epistemicStatus:evidence.epistemicStatus==="direct"?"direct":evidence.epistemicStatus==="hypothesis"?"hypothesis":"derived",rationale:candidate.relationshipReason});
        }
        if(next.depth+1<=state.maxDepth){
          for(const branch of ["neighboring_concepts","people_entities","terminology_changes","causal_predecessors","consequences","retrospective_references","chronology_anchors","implementation_architecture","behavioral_results","contradictions"]){
            state=enqueueHop(state,{evidenceId:evidence.id,clue:patternHopBranchClue(branch,params.seed,evidence.content),depth:next.depth+1,branch:next.branch+">"+branch});
          }
        }
      }
    }
    const newIds=await persistPatternHopEvidence({supabase:params.supabase,runId:run.id,userId:params.userId,projectId:params.projectId,evidence:found.slice(evidenceStart)});
    for(const [clientId,storedId] of newIds) idMap.set(clientId,storedId);
    await persistPatternHopEdges({supabase:params.supabase,runId:run.id,idMap,edges:edges.slice(edgeStart)});
    await savePatternHopRun({supabase:params.supabase,runId:run.id,userId:params.userId,projectId:params.projectId,state});
  }

  const rootBranches=[...DEFAULT_PATTERN_HOP_BRANCHES];
  if(state.status==="active" && objectiveComplete(state,rootBranches)) state={...state,status:"complete"};
  if(state.status==="active" && state.frontier.length===0) state={...state,status:"exhausted"};
  const runtimeProjection=projectPatternHopForRuntime({evidence:found,path,maxItems:8});
  const verificationState={
    rootBranches,
    foundEvidence:found.length,
    edgeCount:edges.length,
    pathSteps:path.length,
    frontierRemaining:state.frontier.length,
    completedBranches:state.completedBranches.length,
    exhaustedBranches:state.exhaustedBranches.length,
    runtimeProjectionCount:runtimeProjection.length,
    absenceSemantics:"An exhausted branch means evidence was not found by the attempted routes; it is not proof that the evidence does not exist.",
  };
  await savePatternHopRun({supabase:params.supabase,runId:run.id,userId:params.userId,projectId:params.projectId,state,verificationState});
  return {runId:run.id,status:state.status,blocker:state.blocker ?? null,state,evidence:rankEvidence(found),edges,path,runtimeProjection,verificationState};
}
