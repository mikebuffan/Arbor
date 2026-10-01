import { describe, expect, it } from "vitest";
import { authorizePublicSourceCapture, planAuthorizedCapture } from "./sourceCaptureAuthorization";
import { createPrivacyCandidate, privacyReleaseDisposition, recordHumanPrivacyDecision } from "./privacyCandidateGate";
import { observeWorkerLiveness } from "./operatorLiveness";
import { createDefaultOffResearchScheduler, evaluateResearchSchedulerActivation } from "./schedulerGate";

describe("source privacy operator controls v7",()=>{
  it("creates a bounded authorized public-source plan without executing it",()=>{
    const auth=authorizePublicSourceCapture({
      authorizationId:"auth-1",sourceUri:"https://records.example.gov/release.pdf",
      expectedHost:"records.example.gov",sourceAuthority:"Synthetic Records Office",
      sourceClass:"official_government",maxBytes:10*1024*1024,maxPages:500,maxWallClockMs:45000,
      allowRedirectsToHosts:["records.example.gov"],authorizedByHuman:true,
      authorizationRef:"human:synthetic-approval",status:"authorized_candidate_not_fetched",
    });
    const plan=planAuthorizedCapture(auth);
    expect(plan.executionRequested).toBe(false);
    expect(plan.status).toBe("plan_ready_not_executed");
    expect(plan.maxPages).toBe(500);
  });

  it("rejects credentials and host drift in source authorization",()=>{
    expect(()=>authorizePublicSourceCapture({
      authorizationId:"a",sourceUri:"https://user:pass@records.example.gov/a.pdf",
      expectedHost:"records.example.gov",sourceAuthority:"Synthetic",sourceClass:"official_government",
      maxBytes:100,maxPages:1,maxWallClockMs:1000,allowRedirectsToHosts:["records.example.gov"],
      authorizedByHuman:true,authorizationRef:"human:x",status:"authorized_candidate_not_fetched",
    })).toThrow("capture_https_public_uri_required");
    expect(()=>authorizePublicSourceCapture({
      authorizationId:"a",sourceUri:"https://other.example.gov/a.pdf",
      expectedHost:"records.example.gov",sourceAuthority:"Synthetic",sourceClass:"official_government",
      maxBytes:100,maxPages:1,maxWallClockMs:1000,allowRedirectsToHosts:["records.example.gov"],
      authorizedByHuman:true,authorizationRef:"human:x",status:"authorized_candidate_not_fetched",
    })).toThrow("capture_host_mismatch");
  });

  it("keeps identifiers on HOLD until a human privacy decision",()=>{
    const candidate=createPrivacyCandidate({
      candidateId:"p1",kind:"phone",literalValue:"202-555-0112",sourceRefs:["page:1"],
      relatedEntityCandidateIds:["entity-candidate-1"],status:"hold_for_human_privacy_classification",
    });
    expect(privacyReleaseDisposition(candidate,null)).toEqual({
      release:"hold",reason:"human_privacy_decision_missing",
    });
    const decision=recordHumanPrivacyDecision({
      decisionId:"pd1",candidateId:"p1",decision:"withhold_private_identifier",
      reviewerRef:"human-reviewer",rationale:"Synthetic private identifier example",
      basisEvidenceRefs:["page:1"],decidedAtUtc:"2026-10-01T21:00:00Z",status:"human_privacy_decision",
    });
    expect(privacyReleaseDisposition(candidate,decision).release).toBe("withhold_identifier");
  });

  it("never infers worker liveness from a declared UI state alone",()=>{
    expect(observeWorkerLiveness({
      workerId:"w1",observedAtUtc:"2026-10-01T21:00:00Z",lastHeartbeatAtUtc:null,
      leaseExpiresAtUtc:null,claimedUnitId:null,declaredState:"running",
    }).status).toBe("unknown");
    expect(observeWorkerLiveness({
      workerId:"w1",observedAtUtc:"2026-10-01T21:00:00Z",lastHeartbeatAtUtc:"2026-10-01T20:59:30Z",
      leaseExpiresAtUtc:"2026-10-01T21:02:00Z",claimedUnitId:"unit-1",declaredState:"running",
    }).status).toBe("active_lease");
    expect(observeWorkerLiveness({
      workerId:"w1",observedAtUtc:"2026-10-01T21:00:00Z",lastHeartbeatAtUtc:"2026-10-01T20:50:00Z",
      leaseExpiresAtUtc:"2026-10-01T20:51:00Z",claimedUnitId:"unit-1",declaredState:"running",
    }).status).toBe("expired_or_stale");
  });

  it("keeps scheduler structurally disabled even if hypothetical activation prerequisites are supplied",()=>{
    expect(createDefaultOffResearchScheduler("research-scheduler")).toMatchObject({enabled:false,cadence:null});
    expect(evaluateResearchSchedulerActivation({
      schedulerId:"research-scheduler",explicitAuthorizationRef:"future:approval",
      integrationExecutionEnabled:true,realSourceIngestionEnabled:true,
    })).toEqual({allowed:false,reasons:["v7_scheduler_activation_not_implemented"]});
  });
});
