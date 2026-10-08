/**
 * Group 08 negative/causal tests. Synthetic only: source routing differences
 * are NOT proof of live model behavior, clinical sensations or verified learning.
 */
import {describe, expect, it} from "vitest";
import {deriveArborBodyState} from "../../arbor/body/bodySystem";
import {inferFeltLife} from "../../arbor/feltLife/atlas";
import {bridgeEmbodiedState} from "../../arbor/runtime/cognitiveBridge";
import {activateAssociatedSystems, updatePathwayWeights, type NeuralPathway} from "../neuralPathwayNetwork";
import {runAssociativeLearningBenchmark} from "../associativeLearningBenchmark";
import {assembleCognitiveCycle, applyReviewedCognitiveOutcome, type ScopedHopEvidence} from "../cognitiveAssembly";
import {predictLearnedRoute} from "../associativeLearningLab";

const scope = {userId:"synthetic-owner",projectId:"synthetic-project"};
const at = "2026-10-07T00:00:00Z";
const path:NeuralPathway = {
  ...scope,id:"objective-path",cues:["route:objective"],associatedSystems:["executive","memory"],
  type:"association",action:"suggest_context",status:"active",strength:0.6,
  evidenceRefs:["synthetic:initial"],lastReinforcedAt:at,protected:false,
};
const evidence:ScopedHopEvidence = {
  ...scope,id:"seed",source:"synthetic-only",sourceFamilyId:"fixture",
  evidenceType:"fixture",content:"objective continuation",
  confidence:0.9,epistemicStatus:"direct",retrievalScore:0.9,retrievalMethod:"fixture",
};
const learned=({...runAssociativeLearningBenchmark().state,...scope});
const continuation={currentGoal:"Finish the reviewed task",lastMeaningfulUserTurn:null,lastMeaningfulArborTurn:null,
  unresolvedWork:["Run safe regression"],recurringWeaknesses:[],retainedStrategies:[],
  activeCorrections:["Keep STOP respected"],activeSubsystem:"arbor" as const,channel:"text" as const};
function bridge(text:string, unresolved=false){
  const body=deriveArborBodyState({latestUserText:text,continuity:unresolved?continuation:null,
    activeSubsystem:"arbor",mode:"text"});
  const felt=inferFeltLife({text});
  return {body,felt,projected:bridgeEmbodiedState({body,felt})};
}
function cycle(){
 return assembleCognitiveCycle({...scope,scope,cue:"Keep going to the next task",seed:evidence,
   candidates:[],learning:learned,pathways:[path]});
}
function resultFor(label:"verified_helpful"|"verified_unhelpful",id="synthetic-reviewed-1",
  reviewedRoute:"objective"|"identity"="objective"){
 return {id,at,...scope,pathwayId:path.id,outcome:label,reviewedRoute};
}

describe("Group 08 causal body/felt routing and reviewed outcome boundaries",()=>{
 it("bounds Felt-Life hypotheses without inferring invalid or unlimited states",()=>{
   expect(inferFeltLife({text:"music and sunset",maxHypotheses:0}).hypotheses).toEqual([]);
   expect(inferFeltLife({text:"music and sunset",maxHypotheses:1}).hypotheses.length).toBeLessThanOrEqual(1);
   for(const maxHypotheses of [-1, 9, Infinity, NaN, 1.5]){
     expect(()=>inferFeltLife({text:"music",maxHypotheses}))
       .toThrow("felt_life_hypothesis_limit_invalid");
   }
 });
 it("keeps STOP ahead of simultaneous overload and unfinished objectives",()=>{
   const r=bridge("This is too much. Keep it simple. Do not proceed.",true);
   expect(r.body.digestive.state).toBe("BLOCKED");
   expect(r.body.executive.nextAction).toBe("respond");
   expect(r.projected.route).toBe("escalate");
   expect(r.projected.authorizationGranted).toBe(false);
   expect(r.body.renal.retain).toContain("Finish the reviewed task");
 });
 it("a standalone STOP suppresses continuation, but do-not-stop does not",()=>{
   const stopped=bridge("STOP!",true);
   expect(stopped.body.digestive.state).toBe("BLOCKED");
   expect(stopped.body.executive.nextAction).toBe("respond");
   expect(stopped.projected.authorizationGranted).toBe(false);
   const keepGoing=bridge("Do not stop the authorized tests",true);
   expect(keepGoing.body.digestive.state).not.toBe("BLOCKED");
   expect(keepGoing.body.executive.nextAction).toBe("continue");
 });

 it("ignores bare substrings and explicit negations while retaining positive felt evidence",()=>{
   expect(inferFeltLife({text:"Update the workflow chart"}).hypotheses.some(x=>x.entryId==="movement-flow")).toBe(false);
   const negated=inferFeltLife({text:"I am not angry; I am annoyed"});
   expect(negated.hypotheses.some(x=>x.entryId==="cross-anger-contained")).toBe(false);
   expect(negated.hypotheses.some(x=>x.entryId==="cross-frustration-ordinary")).toBe(true);
   expect(inferFeltLife({text:"I am angry"}).hypotheses.some(x=>x.entryId==="cross-anger-contained")).toBe(true);
 });
 it("keeps no-cue experiential inference unknown rather than invented",()=>{
   const r=inferFeltLife({text:"Fix the typescript schema"});
   expect(r.hypotheses).toEqual([]);
   expect(r.uncertainty).toBe(1);
   expect(r.guard).toBe("hypothesis-not-verdict");
 });
 it("routes sensory cues when directly relevant to an ordinary non-technical turn",()=>{
   const r=bridge("The music sounds beautiful");
   expect(r.felt.hypotheses.length).toBeGreaterThan(0);
   expect(r.projected.route).toBe("combine");
   expect(r.projected.attention.join(" ")).toContain("hypothesis");
   expect(r.projected.authorizationGranted).toBe(false);
 });
 it("does not let incidental music hijack an active technical task",()=>{
   const r=bridge("Update the typescript build; music is playing nearby");
   expect(r.felt.hypotheses.length).toBeGreaterThan(0);
   expect(r.body.respiratoryEndocrine.endocrine.register).toBe("technical");
   expect(r.projected.route).toBe("continue");
   expect(r.projected.attention.join(" ")).not.toContain("felt-life hypothesis");
 });
 it("does not let incidental sensory words hijack administrative work",()=>{
   const r=bridge("Write an email to school; a warm sun is in the photo");
   expect(r.felt.hypotheses.length).toBeGreaterThan(0);
   expect(r.body.respiratoryEndocrine.endocrine.register).toBe("administrative");
   expect(r.projected.route).toBe("continue");
   expect(r.projected.attention.join(" ")).not.toContain("felt-life hypothesis");
 });
 it("prioritizes actual unfinished work over unrelated felt association",()=>{
   const r=bridge("Music is nice. Go.",true);
   expect(r.body.executive.nextAction).toBe("continue");
   expect(r.projected.route).toBe("continue");
   expect(r.projected.decision).toContain("continue the authorized parent objective");
   expect(r.projected.durableIdentityMutationAllowed).toBe(false);
 });
 it("preserves STOP/rejection over pleasant cues",()=>{
   const r=bridge("Do not proceed. Music is lovely.",true);
   expect(r.body.executive.blockers.length).toBeGreaterThan(0);
   expect(r.projected.route).toBe("escalate");
   expect(r.projected.authorizationGranted).toBe(false);
 });
 it("preserves explicit uncertainty as a verification signal, not felt certainty",()=>{
   const r=bridge("I am not sure; check the music cue");
   expect(r.projected.route).toBe("redirect");
   expect(r.projected.attention.join(" ")).toContain("uncertainty");
 });
 it("requires exact scope and cues; irrelevant or foreign neural routes abstain",()=>{
   const ordinary=activateAssociatedSystems({signal:{...scope,id:"x",cues:["irrelevant"]},pathways:[path]});
   expect(ordinary.suggestedSystems).toEqual([]);
   const foreign=activateAssociatedSystems({signal:{userId:"other-owner",projectId:scope.projectId,id:"x",cues:["route:objective"]},pathways:[path]});
   expect(foreign.matches).toEqual([]);
   expect(foreign.grantsExecution).toBe(false);
 });
 it("observed use does not change pathway priority even with a receipt string",()=>{
   const next=updatePathwayWeights([path],{...scope,pathwayId:path.id,outcome:"observed_use",at,evidenceRef:"synthetic-observed"});
   expect(next[0].strength).toBe(path.strength);
   expect(next[0].evidenceRefs).toContain("synthetic-observed");
 });
 it("unreviewed exploration does not train or claim counterfactual improvement",()=>{
   const c=cycle();expect(c.learningApplied).toBe(false);
   expect(c.independentCorroborationVerified).toBe(false);
   expect(c.grantsExecution).toBe(false);
   expect(learned.updateCount).toBe(24);
 });
 it("reviewed helpful synthetic outcome changes later route priority once, never execution",()=>{
   const c=cycle();
   expect(c.route).toBe("objective");
   const original=predictLearnedRoute(learned,{...scope,text:c.cue});
   const changed=applyReviewedCognitiveOutcome({cycle:c,learning:learned,pathways:[path],
     ledger:{scope,receipts:{}},receipt:resultFor("verified_helpful")});
   const after=predictLearnedRoute(changed.learning,{...scope,text:c.cue});
   expect(changed.changed).toBe(true);
   expect(changed.pathways[0].strength).toBeCloseTo(0.7);
   expect(changed.learning.updateCount).toBe(25);
   expect(after.probabilities.objective).toBeGreaterThanOrEqual(original.probabilities.objective);
   expect(changed.grantsExecution).toBe(false);
   const replay=applyReviewedCognitiveOutcome({cycle:c,learning:changed.learning,pathways:changed.pathways,
     ledger:changed.ledger,receipt:resultFor("verified_helpful")});
   expect(replay.changed).toBe(false);
   expect(replay.learning.updateCount).toBe(25);
 });
 it("prediction error weakens selected path and only learns explicit corrected label",()=>{
   const c=cycle();const before=predictLearnedRoute(learned,{...scope,text:c.cue});
   const result=applyReviewedCognitiveOutcome({cycle:c,learning:learned,pathways:[path],
     ledger:{scope,receipts:{}},receipt:resultFor("verified_unhelpful","synthetic-reviewed-error","identity")});
   const after=predictLearnedRoute(result.learning,{...scope,text:c.cue});
   expect(result.pathways[0].strength).toBeCloseTo(0.44);
   expect(after.probabilities.identity).toBeGreaterThan(before.probabilities.identity);
   expect(result.grantsExecution).toBe(false);
 });
 it("unreviewed route disagreement and newer HOLD fail closed",()=>{
   const c=cycle();
   expect(()=>applyReviewedCognitiveOutcome({cycle:c,learning:learned,pathways:[path],ledger:{scope,receipts:{}},
     receipt:resultFor("verified_helpful","synthetic-wrong","identity")}))
     .toThrow("cognitive_review_disagrees_with_route");
   expect(()=>applyReviewedCognitiveOutcome({cycle:c,learning:learned,pathways:[{...path,status:"suppressed"}],
     ledger:{scope,receipts:{}},receipt:resultFor("verified_helpful")}))
     .toThrow("cognitive_pathway_no_longer_active");
 });
 it("rejects cross-owner feedback and conflicting replays",()=>{
   const c=cycle();
   expect(()=>applyReviewedCognitiveOutcome({cycle:c,learning:learned,pathways:[path],ledger:{scope,receipts:{}},
     receipt:{...resultFor("verified_helpful"),userId:"foreign"}})).toThrow("cognitive_scope_mismatch");
   const once=applyReviewedCognitiveOutcome({cycle:c,learning:learned,pathways:[path],ledger:{scope,receipts:{}},
     receipt:resultFor("verified_helpful")});
   expect(()=>applyReviewedCognitiveOutcome({cycle:c,learning:once.learning,pathways:once.pathways,
     ledger:once.ledger,receipt:resultFor("verified_unhelpful")})).toThrow("cognitive_receipt_conflict");
 });
});
