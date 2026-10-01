import { describe, expect, it } from "vitest";
import {
  classifyDocumentTypology,
  createEvidenceMention,
  extractStructuralEntities,
  fingerprintPage,
  missingIntegerSequence,
  nearDuplicateSimilarity,
  planPageBatches,
} from "./investigationIngestion";

const H="a".repeat(64);

describe("investigation ingestion",()=>{
  it("classifies document families without narrative interpretation",()=>{
    expect(classifyDocumentTypology({filename:"manifest.pdf",textSample:"Passenger Departure Arrival Tail Number"})).toBe("flight_manifest");
    expect(classifyDocumentTypology({filename:"x.txt",textSample:"From: a@example.org\nTo: b@example.org\nSubject: test"})).toBe("email_or_message");
  });

  it("extracts deterministic structural formats with offsets",()=>{
    const text="Email A@EXAMPLE.ORG, call (202) 555-0112, 123 Main Street, account # AB-12345, aircraft N550MS, $1,250.00 on January 2, 2004.";
    const kinds=extractStructuralEntities(text).map(x=>x.kind);
    expect(kinds).toContain("email");
    expect(kinds).toContain("phone");
    expect(kinds).toContain("address");
    expect(kinds).toContain("account_number");
    expect(kinds).toContain("tail_number");
    expect(kinds).toContain("money");
    expect(kinds).toContain("date");
    for(const item of extractStructuralEntities(text))expect(text.slice(item.startUtf16,item.endUtf16)).toBe(item.value);
  });

  it("fingerprints exact bytes separately from normalized text and scores near duplicates",async()=>{
    const a=await fingerprintPage({bytes:new TextEncoder().encode("page-A"),extractedText:"Alpha   beta\r\nGamma"});
    const b=await fingerprintPage({bytes:new TextEncoder().encode("page-B"),extractedText:"Alpha beta\nGamma stamped"});
    expect(a.exactSha256).not.toBe(b.exactSha256);
    expect(nearDuplicateSimilarity(a,b)).toBeGreaterThan(0.5);
    expect(nearDuplicateSimilarity(a,a)).toBe(1);
  });

  it("detects sequence gaps without inventing endpoints",()=>{
    expect(missingIntegerSequence([100,101,103,105])).toEqual([102,104]);
    expect(missingIntegerSequence([5])).toEqual([]);
  });

  it("creates immutable-source mention coordinates without requiring identity resolution",()=>{
    const mention=createEvidenceMention({
      mentionId:"m1",pageHash:H,documentId:"doc",physicalPage:4,lineStart:10,lineEnd:10,
      startUtf16:20,endUtf16:28,rawText:" J. Doe ",extractionMethod:"text_layer",
      extractionConfidence:null,entityCandidateId:null,
    });
    expect(mention.normalizedText).toBe("J. Doe");
    expect(mention.entityCandidateId).toBeNull();
  });

  it("plans deterministic bounded batches with full page hash membership",()=>{
    const plans=planPageBatches({documentId:"doc",pageHashes:[H,"b".repeat(64),"c".repeat(64)],maxPagesPerBatch:2});
    expect(plans).toHaveLength(2);
    expect(plans[0]).toMatchObject({startPhysicalPage:1,endPhysicalPage:2,pageCount:2});
    expect(plans[0].idempotencyKey).toContain(H);
  });
});
