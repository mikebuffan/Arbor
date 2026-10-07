import { describe, expect, it } from "vitest";
import { buildAnnabelleContinuityReport, continuityPromptBlock } from "../continuityEngine";

describe("Annabelle continuity engine",()=>{
  it("tracks clock, relationships, injuries, knowledge, motifs and screen time without inventing progression",()=>{
    const report=buildAnnabelleContinuityReport([
      {chapter:2,elapsedDays:3,season:"winter",characters:["Ever","Will"],relationships:{"Ever/Will":"early trust"},injuries:{Ever:"limping"},knowledge:{Ever:["Will stayed"]},motifs:["coffee"],timeOfDay:"morning",location:"cabin",clothing:{Ever:"wool coat"},objects:{mug:"on table"}},
      {chapter:5,elapsedDays:12,season:"winter",characters:["Ever"],relationships:{"Ever/Will":"dating"},injuries:{Ever:"healing"},knowledge:{Will:["Ever was injured"]},motifs:["coffee","door"],timeOfDay:"night",location:"house",clothing:{Ever:"shirt"},objects:{mug:"sink"}},
    ]);
    expect(report.elapsedDays).toBe(12);
    expect(report.characterScreenTime.Ever).toBe(2);
    expect(report.relationshipStages["Ever/Will"]).toBe("dating");
    expect(report.injuryStates.Ever).toBe("healing");
    expect(report.knowledgeByCharacter.Will).toContain("Ever was injured");
    expect(report.motifAppearances.coffee).toEqual([2,5]);
    expect(report.timeOfDayByChapter[2]).toContain("morning");
    expect(report.locationsByChapter[5]).toContain("house");
    expect(report.objectStates.mug).toBe("sink");
    expect(continuityPromptBlock(report)).toContain("Never advance time");
  });
});
