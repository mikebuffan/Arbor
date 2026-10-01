import { describe, expect, it } from "vitest";
import {
  aliasSimilarity,
  createEntityCandidate,
  createIdentityDecision,
  currentIdentityDecision,
  rankAliasCandidates,
} from "./entityResolution";

describe("entity resolution gate",()=>{
  const candidate=createEntityCandidate({
    candidateId:"candidate-1",kind:"person",canonicalLabel:"Jeffrey Example",
    aliases:["J. Example","Jeffery Example"],supportingMentionIds:["m1"],
  });

  it("ranks fuzzy aliases only as candidates",()=>{
    const ranked=rankAliasCandidates({observedLabel:"Jeffery Example",candidates:[candidate]});
    expect(ranked[0].candidateId).toBe("candidate-1");
    expect(ranked[0].similarity).toBeGreaterThan(.9);
    expect(aliasSimilarity("J. Example","J Example")).toBeGreaterThan(.8);
  });

  it("requires evidence basis for all decisions and target only for resolved identities",()=>{
    expect(()=>createIdentityDecision({
      decisionId:"d1",candidateId:"candidate-1",targetEntityId:"entity-1",status:"candidate",
      basisMentionIds:["m1"],decidedAtUtc:"2026-10-01T18:00:00.000Z",supersedesDecisionId:null,rationale:"synthetic",
    })).toThrow("unresolved_identity_cannot_target");
    expect(()=>createIdentityDecision({
      decisionId:"d1",candidateId:"candidate-1",targetEntityId:null,status:"resolved",
      basisMentionIds:["m1"],decidedAtUtc:"2026-10-01T18:00:00.000Z",supersedesDecisionId:null,rationale:"synthetic",
    })).toThrow("resolved_identity_requires_target");
  });

  it("preserves correction history and exposes one current head",()=>{
    const d1=createIdentityDecision({
      decisionId:"d1",candidateId:"candidate-1",targetEntityId:"entity-1",status:"resolved",
      basisMentionIds:["m1"],decidedAtUtc:"2026-10-01T18:00:00.000Z",supersedesDecisionId:null,rationale:"initial synthetic resolution",
    });
    const d2=createIdentityDecision({
      decisionId:"d2",candidateId:"candidate-1",targetEntityId:null,status:"rejected",
      basisMentionIds:["m1","m2"],decidedAtUtc:"2026-10-01T18:05:00.000Z",supersedesDecisionId:"d1",rationale:"contradictory synthetic identifier",
    });
    expect(currentIdentityDecision([d1,d2],"candidate-1")?.decisionId).toBe("d2");
    expect(d1.targetEntityId).toBe("entity-1");
  });
});
