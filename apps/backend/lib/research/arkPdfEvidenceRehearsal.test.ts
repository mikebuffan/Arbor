import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArkExecutorRegistry } from "../ark/executorRegistry";
import type { ArkClaim } from "../ark/types";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchStore } from "./sessionRunner";
import { stageLocalPdfPilotBatch } from "./offlinePdfBatchPilot";
import { ARK_RESEARCH_TASK_KIND, registerArkResearchSessionExecutor } from "./registerArkResearchSessionExecutor";

/**
 * One hermetic, BENIGN local original -> Poppler -> saved page inventory ->
 * checked local original -> research receipt -> ARK checkpoint. No live DB,
 * source downloader, model, cron, victim data or production evidence ID.
 */
function harmlessPdf(): Buffer {
  const stream="BT /F1 12 Tf 40 450 Td (HARMLESS ARK PDF HANDOFF) Tj ET";
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length "+Buffer.byteLength(stream,"ascii")+" >>\nstream\n"+stream+"\nendstream",
  ];
  let data="%PDF-1.4\n%harmless-ark-test\n";
  const offsets:number[]=[];
  for(const [i,obj] of objects.entries()){
    offsets.push(Buffer.byteLength(data,"ascii"));
    data+=(i+1)+" 0 obj\n"+obj+"\nendobj\n";
  }
  const xref=Buffer.byteLength(data,"ascii");
  data+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
  for(const offset of offsets)data+=String(offset).padStart(10,"0")+" 00000 n \n";
  return Buffer.from(
    data+"trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n",
    "ascii",
  );
}

const at="2026-09-23T19:00:00.000Z";
const claim:ArkClaim={
  objective:{
    id:"ark-objective",userId:"owner",projectId:"research",
    goal:"Benign page receipt pilot",status:"running",priority:0,
    budget:{maxTasksPerCycle:1,maxRuntimeMs:25000,maxAttemptsPerTask:3},
    blocker:null,completionEvidence:null,version:0,createdAt:at,updatedAt:at,
  },
  task:{
    id:"ark-task",objectiveId:"ark-objective",userId:"owner",
    projectId:"research",taskKey:"one-benign-document",
    kind:ARK_RESEARCH_TASK_KIND,description:"Stage harmless original",
    status:"running",dependencies:[],payload:{sessionId:"research-session"},
    result:null,attemptCount:1,maxAttempts:3,idempotencyKey:"ark-once",
    availableAt:at,leaseOwner:"test-worker",leaseToken:"test-lease",
    leaseExpiresAt:at,heartbeatAt:at,checkpointSequence:0,version:0,
    createdAt:at,updatedAt:at,
  },
};

describe("connected harmless PDF -> research receipt -> ARK checkpoint",()=>{
  it("only exposes a LOCAL REVIEW reference after original and page record readback",async()=>{
    const root=await mkdtemp(join(tmpdir(),"arbor-ark-pdf-proof-"));
    try {
      const localPath=join(root,"harmless.pdf");
      const outputDirectory=join(root,"protected");
      const bytes=harmlessPdf();
      const expectedHash=createHash("sha256").update(bytes).digest("hex");
      await writeFile(localPath,bytes);
      const sourceUri="https://example.org/harmless-ark-proof.pdf";
      const documentId="HARMLESS-ARK-PROOF";
      const recordKey=createHash("sha256")
        .update(JSON.stringify([sourceUri,documentId,expectedHash]))
        .digest("hex");
      const session:ResearchSession={
        id:"research-session",userId:"owner",projectId:"research",
        objective:"Benign page receipt pilot",status:"queued",
        startedAt:at,
        deadlineAt:new Date(Date.parse(at)+60*60*1000).toISOString(),
        maxWorkUnits:2,consumedWorkUnits:0,maxCostCents:1,
        committedCostCents:0,authorized:true,cancellationRequested:false,
        unresolvedRequiredWork:1,completedEvidenceRefs:[],
      };
      const researchClaim={
        unitId:"research-unit",leaseToken:"research-lease",
        idempotencyKey:"research-unit",kind:"synthetic.local_pdf",
        payload:{label:"nonauthoritative"},maxCostReservationCents:0,
      };
      const store:ResearchStore={
        loadSession:vi.fn(async()=>({...session,
          completedEvidenceRefs:[...session.completedEvidenceRefs]})),
        claimOne:vi.fn(async()=>session.unresolvedRequiredWork>0
          ?researchClaim:null),
        settle:vi.fn(async({receipt})=>{
          // A local artifact reference is never a production evidence ID.
          expect(receipt.evidenceRefs).toEqual(["local-review-only:"+recordKey]);
          const original=await readFile(
            join(outputDirectory,"originals",expectedHash+".pdf"));
          expect(createHash("sha256").update(original).digest("hex"))
            .toBe(expectedHash);
          const saved=JSON.parse(await readFile(
            join(outputDirectory,"records",recordKey+".json"),"utf8"));
          expect(saved.originalBytesSha256).toBe(expectedHash);
          expect(saved.sourceUriVerification)
            .toBe("operator_supplied_not_independently_fetched");
          expect(saved.pages).toHaveLength(1);
          expect(saved.pages[0].locator.physicalPdfPage).toBe(1);
          expect(saved.pages[0].extractedText)
            .toContain("HARMLESS ARK PDF HANDOFF");
          expect(saved.pages[0].reviewStatus)
            .toBe("hold_for_original_page_image_and_privacy_review");
          session.consumedWorkUnits=1;
          session.unresolvedRequiredWork=0;
          session.completedEvidenceRefs=[...receipt.evidenceRefs];
          session.status="running";
          return "committed" as const;
        }),
        stop:vi.fn(async()=>{}),
      };
      const execute=vi.fn(async({
        session:s,claim:c,
      }:{
        session:ResearchSession;
        claim:typeof researchClaim;
      })=>{
        // Source choice comes only from trusted test/host state, not task payload.
        const [staged]=await stageLocalPdfPilotBatch({
          items:[{localPath,sourceUri,documentId}],
          outputDirectory,benignFixtureMode:true,
        });
        if(staged.status!=="staged_review_only"||
           staged.originalSha256!==expectedHash||
           staged.physicalPages!==1||staged.failedPages!==0) {
          throw Error("synthetic_staging_not_verified");
        }
        const record=JSON.parse(await readFile(
          join(outputDirectory,"records",recordKey+".json"),"utf8"));
        if(record.originalBytesSha256!==expectedHash||
           record.pages?.[0]?.reviewStatus!==
             "hold_for_original_page_image_and_privacy_review") {
          throw Error("synthetic_page_readback_failed");
        }
        return{
          sessionId:s.id,unitId:c.unitId,idempotencyKey:c.idempotencyKey,
          status:"completed" as const,recordedAt:at,costCents:0,
          evidenceRefs:["local-review-only:"+recordKey],
          unresolvedRequiredWork:0,
        };
      });
      const registry=new ArkExecutorRegistry();
      registerArkResearchSessionExecutor({
        registry,now:()=>new Date(at),
        resolveTrustedBinding:async()=>({
          handoff:{
            ownerId:"owner",projectId:"research",
            objectiveId:"ark-objective",sessionId:"research-session",
            authorizationVersion:"synthetic-v1",sourceAccessApproved:true,
            privacyReviewRequired:true,
          },
          store,executor:execute,
        }),
      });
      const worker=registry.get(ARK_RESEARCH_TASK_KIND)!;
      const first=await worker({claim,heartbeat:async()=>{}});
      expect(first).toMatchObject({
        status:"checkpointed",
        checkpoint:{
          state:{
            latestEvidenceRefs:["local-review-only:"+recordKey],
            researchStatus:"committed",independentReviewVerified:false,
          },
          nextAction:"Await independent research completion and source/privacy review.",
        },
      });
      expect(execute).toHaveBeenCalledOnce();
      expect(await readdir(join(outputDirectory,"originals"))).toEqual([
        expectedHash+".pdf",
      ]);
      expect(await readdir(join(outputDirectory,"records"))).toEqual([
        recordKey+".json",
      ]);
      const second=await worker({claim:{
        ...claim,task:{...claim.task,checkpointSequence:1,attemptCount:2},
      },heartbeat:async()=>{}});
      expect(second).toMatchObject({
        status:"blocked",blocker:{kind:"high_consequence_fork"},
      });
      expect(execute).toHaveBeenCalledOnce();
      expect(await readdir(join(outputDirectory,"records"))).toHaveLength(1);
    } finally {
      await rm(root,{recursive:true,force:true});
    }
  });
});
