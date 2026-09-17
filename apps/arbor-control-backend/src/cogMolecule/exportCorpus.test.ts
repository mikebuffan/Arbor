import { describe, expect, it } from "vitest";
import { assembleExportCorpus, provenanceRetention } from "./exportCorpus.js";
import { exportRecordToCogPacket, type StructuredExportRecord } from "./exportIngestion.js";

describe("structured export corpus torture", () => {
  it("preserves same-id conflicting values rather than silently reconciling them", () => {
    const packet=exportRecordToCogPacket({id:"conflict",facts:[{id:"fact:x",value:"A",source:"chat:1"},{id:"fact:x",value:"B",source:"chat:2"}]});
    expect(packet.evidence.filter(e=>e.id==="fact:x")).toHaveLength(2);
    expect(packet.evidence.map(e=>e.value)).toEqual(["A","B"]);
  });
  it("keeps historical claims when a later correction arrives", () => {
    const corpus=assembleExportCorpus([[{id:"old",facts:[{id:"claim",value:"old",source:"chat:1"}],unresolved:["possible-correction"]}],[{id:"new",facts:[{id:"claim",value:"corrected",source:"chat:50"}],metadata:{supersedes:"old"}}]]);
    expect(corpus.byRecordId.get("old")?.evidence[0]?.value).toBe("old");
    expect(corpus.byRecordId.get("new")?.evidence[0]?.value).toBe("corrected");
    expect(corpus.records).toHaveLength(2);
  });
  it("does not lose cross-conversation relationships at chunk boundaries", () => {
    const chunks:StructuredExportRecord[][]=[[{id:"a",facts:[{id:"A",value:"first",source:"chat:1"}]}],[{id:"b",facts:[{id:"B",value:"later",source:"chat:99"}],relationships:[{id:"r",from:"A",to:"B",relation:"precedes",source:"chat:100"}]}]];
    const corpus=assembleExportCorpus(chunks); const b=corpus.byRecordId.get("b")!;
    expect(b.hypotheses[0]?.id).toBe("r"); expect(b.evidence.some(e=>e.id==="relationship:r")).toBe(true);
  });
  it("preserves arrival order separately from chronology metadata", () => {
    const packet=exportRecordToCogPacket({id:"chronology",facts:[{id:"later",value:{eventAt:"2026-02-01"},source:"chat:1"},{id:"earlier",value:{eventAt:"2025-01-01"},source:"chat:2"}]});
    expect(packet.evidence.map(e=>e.id)).toEqual(["later","earlier"]);
  });
  it("keeps unresolved long-distance references live", () => {
    const first=exportRecordToCogPacket({id:"first",facts:[{id:"mention",value:"see later",source:"chat:1",unresolved:["ref:answer"]}]});
    const later=exportRecordToCogPacket({id:"later",facts:[{id:"answer",value:"resolved candidate",source:"chat:500"}]});
    expect(first.unresolved).toContain("ref:answer"); expect(later.evidence[0]?.id).toBe("answer");
  });
  it("retains a complete source trail through relationships and contests", () => {
    const packet=exportRecordToCogPacket({id:"prov",provenance:["export:1"],facts:[{id:"a",value:1,source:"chat:1"}],relationships:[{id:"r",from:"a",to:"b",relation:"linked",source:"chat:2",contestedBy:["chat:3"]}]});
    expect(provenanceRetention(packet,["export:1","chat:1","chat:2","chat:3"])).toBe(1);
  });
  it("handles a larger batch without semantic dedupe at ingestion", () => {
    const records=Array.from({length:1000},(_,i):StructuredExportRecord=>({id:`r:${i}`,facts:[{id:`f:${i}`,value:i,source:`chat:${i}`},{id:"shared",value:i%2,source:`chat:${i}:shared`}]}));
    const corpus=assembleExportCorpus([records.slice(0,333),records.slice(333,777),records.slice(777)]);
    expect(corpus.packets).toHaveLength(1000); expect(corpus.packets.reduce((n,p)=>n+p.evidence.length,0)).toBe(2000);
  });
});
