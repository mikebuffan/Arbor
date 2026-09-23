import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stageLocalPdfPilotBatch } from "./offlinePdfBatchPilot";

// Independently parseable benign original bytes: test the actual Poppler boundary.
function harmlessPdf(): Buffer {
  const stream=(s:string)=>"<< /Length "+Buffer.byteLength(s,"ascii")+
    " >>\nstream\n"+s+"\nendstream";
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    stream("BT /F1 12 Tf 40 450 Td (HARMLESS PILOT BATCH FIXTURE) Tj ET"),
  ];
  let data="%PDF-1.4\n%harmless-test-only\n";
  const offsets:number[]=[];
  for(const [i,obj] of objects.entries()){
    offsets.push(Buffer.byteLength(data,"ascii"));
    data+=(i+1)+" 0 obj\n"+obj+"\nendobj\n";
  }
  const xref=Buffer.byteLength(data,"ascii");
  data+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
  for(const offset of offsets) data+=String(offset).padStart(10,"0")+" 00000 n \n";
  data+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n";
  return Buffer.from(data,"ascii");
}

describe("local review-only PDF batch staging",()=>{
  it("stages original SHA and exact pages, then resumes without duplicate writes",async()=>{
    const root=await mkdtemp(join(tmpdir(),"arbor-pilot-test-"));
    try {
      const bytes=harmlessPdf();
      const localPath=join(root,"fixture.pdf");
      const outputDirectory=join(root,"private-results");
      await writeFile(localPath,bytes);
      const item={localPath,sourceUri:"https://example.org/synthetic.pdf",documentId:"SYNTHETIC-1"};
      const first=await stageLocalPdfPilotBatch({items:[item],outputDirectory});
      expect(first).toMatchObject([{
        index:0,status:"staged_review_only",physicalPages:1,textLayerPages:1,
        imageOnlyPages:0,failedPages:0,
      }]);
      const hash=createHash("sha256").update(bytes).digest("hex");
      expect(first[0].originalSha256).toBe(hash);
      expect(await readFile(join(outputDirectory,"originals",hash+".pdf"))).toEqual(bytes);
      const filenames=await readdir(join(outputDirectory,"records"));
      expect(filenames).toHaveLength(1);
      const manifest=JSON.parse(await readFile(join(outputDirectory,"records",filenames[0]),"utf8"));
      expect(manifest.originalBytesSha256).toBe(hash);
      expect(manifest.sourceUriVerification).toBe("operator_supplied_not_independently_fetched");
      expect(manifest.pages).toHaveLength(1);
      expect(manifest.pages[0].extractedText).toContain("HARMLESS PILOT");
      expect(manifest.pages[0].reviewStatus).toBe("hold_for_original_page_image_and_privacy_review");
      expect((await stat(join(outputDirectory,"records",filenames[0]))).mode&0o777).toBe(0o600);
      expect((await stageLocalPdfPilotBatch({items:[item],outputDirectory}))[0].status)
        .toBe("already_staged");
      await writeFile(join(outputDirectory,"records",filenames[0]),"tampered");
      const afterTamper=await stageLocalPdfPilotBatch({items:[item],outputDirectory});
      expect(afterTamper).toMatchObject([{status:"held",reason:"pilot_existing_artifact_mismatch"}]);
    } finally { await rm(root,{recursive:true,force:true}); }
  });
  it("holds an HTML impostor and never creates an evidence record",async()=>{
    const root=await mkdtemp(join(tmpdir(),"arbor-pilot-test-"));
    try {
      const localPath=join(root,"not-a-pdf.pdf");
      const outputDirectory=join(root,"out");
      await writeFile(localPath,"<html>age gate</html>");
      const result=await stageLocalPdfPilotBatch({items:[{
        localPath,sourceUri:"https://example.org/age-gate.pdf",documentId:"BLOCKED",
      }],outputDirectory});
      expect(result).toMatchObject([{status:"held",reason:"invalid_pdf_binary_signature"}]);
      expect(await readdir(join(outputDirectory,"records"))).toEqual([]);
    } finally { await rm(root,{recursive:true,force:true}); }
  });
});
