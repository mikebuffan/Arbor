import { describe, expect, it } from "vitest";
import {
  adversarialFindingCheck,
  createFindingVersion,
  createRoundaboutDirective,
  downstreamEvidenceReplay,
  investigationCockpit,
  publicationPreflight,
} from "./findingIntegrity";

describe("finding integrity",()=>{
  const finding=createFindingVersion({
    findingId:"f1",version:1,statement:"Synthetic relationship observed in two records.",
    evidenceStatus:"corroborated",identityStatus:"resolved",connectionTypes:["documented"],
    dependencies:[{evidenceRef:"e1",role:"support"},{evidenceRef:"e2",role:"support"}],
    unresolvedWeaknesses:[],reviewStatus:"hold_for_human_review",supersedesVersion:null,
  });

  it("replays every dependent finding when evidence changes",()=>{
    expect(downstreamEvidenceReplay([finding],[{evidenceRef:"e2",changeType:"reclassified_duplicate",reason:"same origin"}]))
      .toEqual([{findingId:"f1",version:1,changedEvidenceRefs:["e2"],action:"re_review_required"}]);
  });

  it("holds claimed corroboration when source independence collapses",()=>{
    const result=adversarialFindingCheck({
      finding,independentSourceFamilyCount:1,counterevidenceRefs:["counter-search:1"],
      alternativeExplanations:["shared administrative process"],chronologyConflictIds:[],unresolvedIdentityIds:[],
    });
    expect(result.status).toBe("hold");
    expect(result.failures).toContain("corroboration_not_independent");
  });

  it("requires privacy, original-page and release authorization before export",()=>{
    expect(publicationPreflight({findingId:"f1",unresolvedPrivacyFlagIds:[],originalPageReviewComplete:true,releaseAuthorized:false}).status).toBe("hold");
    expect(publicationPreflight({findingId:"f1",unresolvedPrivacyFlagIds:[],originalPageReviewComplete:true,releaseAuthorized:true}).status).toBe("authorized_for_export");
  });

  it("bounds Roundabout directives and keeps model confidence out of evidence status",()=>{
    const d=createRoundaboutDirective({
      directiveId:"r1",anomalyRef:"a1",query:"find matching synthetic schedule record",
      expectedEvidenceType:"calendar",maxDepth:2,maxHopsPerAttempt:2,
      stoppingCondition:"source family exhausted",triggerEvidenceRefs:["e1"],
    });
    expect(d.maxDepth).toBe(2);
    expect(()=>createRoundaboutDirective({...d,maxDepth:99})).toThrow("invalid_max_depth");
  });

  it("summarizes cockpit counts without manufacturing findings",()=>{
    const c=investigationCockpit({
      totalPages:10,uniquePages:8,duplicatePages:2,unresolvedIdentityCount:1,
      contradictionCount:2,missingSourceLeadCount:1,activeRoundaboutCount:1,
      unprocessedFamilyCount:0,findingsAwaitingReview:3,
    });
    expect(c.coverage.uniqueRatio).toBe(.8);
  });
});
