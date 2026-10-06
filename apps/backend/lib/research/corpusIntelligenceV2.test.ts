import { describe, expect, it } from "vitest";
import { runOptInOcr, reviewOcrReceipt } from "./ocrReview";
import { reconstructTable, tableRowObjects } from "./tableReconstruction";
import { hybridRetrieve } from "./hybridRetrieval";
import { reconstructDocumentFamilies } from "./documentFamilyReconstruction";
import type { PdfPageImageReceipt } from "./pdfPageImageProvenance";

async function imageFixture(){
  const bytes=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3,4]);
  const digest=await crypto.subtle.digest("SHA-256",bytes.buffer);
  const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
  const image:PdfPageImageReceipt={
    sourceUri:"https://example.org/synthetic.pdf",documentId:"doc-1",
    originalBytesSha256:"a".repeat(64),originalDocumentPageCount:1,physicalPdfPage:1,
    imageFormat:"png",imageBytesSha256:hash,imageByteLength:bytes.byteLength,
    renderer:"poppler-pdftoppm",rendererVersion:"synthetic-1",dpi:150,
    renderedAtUtc:"2026-10-01T19:00:00.000Z",
    reviewStatus:"hold_for_original_page_image_and_privacy_review",
  };
  return {bytes,image};
}

describe("corpus intelligence v2",()=>{
  it("binds OCR to exact rendered bytes and preserves correction history separately",async()=>{
    const {bytes,image}=await imageFixture();
    const receipt=await runOptInOcr({
      image,pngBytes:bytes,authorizedOptIn:true,
      engine:async()=>({
        engine:"synthetic-ocr",engineVersion:"1",pagePixelWidth:100,pagePixelHeight:100,
        sourceKind:"handwritten" as const,
        tokens:[
          {tokenId:"t1",text:"J.",confidence:.7,box:{x:5,y:10,width:10,height:8}},
          {tokenId:"t2",text:"Example",confidence:.6,box:{x:20,y:10,width:30,height:8}},
        ],
      }),
    });
    expect(receipt.imageBytesSha256).toBe(image.imageBytesSha256);
    expect(receipt.extractedText).toBe("J. Example");
    expect(receipt.reviewStatus).toMatch(/^hold_/);
    const reviewed=reviewOcrReceipt({
      receipt,reviewerRef:"human-reviewer",reviewedAtUtc:"2026-10-01T19:05:00.000Z",
      decision:"corrected",correctedText:"J. Exemple",correctionNotes:"synthetic handwriting correction",
    });
    expect(reviewed.ocrReceipt.extractedText).toBe("J. Example");
    expect(reviewed.correctedText).toBe("J. Exemple");
  });

  it("reconstructs a 2x2 table while retaining token and source coordinates",()=>{
    const H="b".repeat(64);
    const table=reconstructTable({rowTolerancePx:8,columnTolerancePx:25,tokens:[
      {tokenId:"a",text:"Name",sourceRef:"p1:a",pageHash:H,x:10,y:10,width:30,height:10,confidence:1},
      {tokenId:"b",text:"Amount",sourceRef:"p1:b",pageHash:H,x:120,y:10,width:40,height:10,confidence:1},
      {tokenId:"c",text:"Alpha",sourceRef:"p1:c",pageHash:H,x:10,y:40,width:30,height:10,confidence:.9},
      {tokenId:"d",text:"$10",sourceRef:"p1:d",pageHash:H,x:120,y:40,width:20,height:10,confidence:.9},
    ]});
    expect(table.rowCount).toBe(2);
    expect(table.columnCount).toBe(2);
    expect(table.cells).toHaveLength(4);
    expect(tableRowObjects(table)[1]).toEqual({column_0:"Alpha",column_1:"$10"});
    expect(table.status).toBe("candidate_requires_visual_review");
  });

  it("ranks exact identifiers, lexical text, and optional semantic vectors without promoting hits",()=>{
    const hits=hybridRetrieve({
      query:{text:"aircraft scheduling",identifiers:["N550MS"],embedding:[1,0]},
      documents:[
        {recordId:"d1",text:"flight schedule for aircraft",identifiers:["N550MS"],sourceRefs:["page:1"],embedding:[.95,.05]},
        {recordId:"d2",text:"aircraft maintenance memo",identifiers:["N111AA"],sourceRefs:["page:2"],embedding:[.7,.3]},
        {recordId:"d3",text:"unrelated bank record",identifiers:["ACCT-1"],sourceRefs:["page:3"],embedding:[0,1]},
      ],
    });
    expect(hits[0].recordId).toBe("d1");
    expect(hits[0].reasons).toEqual(expect.arrayContaining(["exact_identifier_overlap","lexical_match","precomputed_semantic_similarity"]));
    expect(hits[0].sourceRefs).toEqual(["page:1"]);
  });

  it("reconstructs explicit email/attachment and deposition/exhibit families without proximity guessing",()=>{
    const families=reconstructDocumentFamilies([
      {documentId:"email-1",kind:"email",sourceRefs:["p1"],messageId:"m1"},
      {documentId:"email-2",kind:"email",sourceRefs:["p2"],messageId:"m2",inReplyToMessageId:"m1"},
      {documentId:"att-1",kind:"attachment",sourceRefs:["p3"],attachmentOfDocumentId:"email-2"},
      {documentId:"dep-1",kind:"deposition",sourceRefs:["p4"]},
      {documentId:"ex-1",kind:"exhibit",sourceRefs:["p5"],exhibitOfDocumentId:"dep-1"},
      {documentId:"lonely",kind:"other",sourceRefs:["p6"]},
    ]);
    expect(families.some(f=>f.documentIds.join(",")==="att-1,email-1,email-2")).toBe(true);
    expect(families.some(f=>f.documentIds.join(",")==="dep-1,ex-1")).toBe(true);
    expect(families.some(f=>f.documentIds.join(",")==="lonely")).toBe(true);
  });
});
