import { describe, expect, it } from "vitest";
import {
  detectRecurringPatterns,
  detectResponsePatternShifts,
  detectTemporalConflicts,
  type TimelineObservation,
} from "./timelineAnalysis";

describe("timeline and response patterns",()=>{
  it("flags incompatible same-entity location windows without asserting motive",()=>{
    const rows:TimelineObservation[]=[
      {observationId:"a",entityIds:["E"],placeId:"NY",relation:"exact",startUtc:"2020-01-01T12:00:00Z",endUtc:null,reportedAtUtc:null,evidenceRefs:["p1"]},
      {observationId:"b",entityIds:["E"],placeId:"LA",relation:"exact",startUtc:"2020-01-01T12:10:00Z",endUtc:null,reportedAtUtc:null,evidenceRefs:["p2"]},
    ];
    expect(detectTemporalConflicts(rows,{minimumTravelMinutesBetweenPlaces:60})[0].reason).toBe("non_overlapping_locations");
  });

  it("detects recurring keys only after a minimum count",()=>{
    const out=detectRecurringPatterns([
      {observationId:"1",key:"route:A-B",atUtc:"2020-01-01T00:00:00Z"},
      {observationId:"2",key:"route:A-B",atUtc:"2020-02-01T00:00:00Z"},
      {observationId:"3",key:"route:A-B",atUtc:"2020-03-01T00:00:00Z"},
      {observationId:"4",key:"route:C-D",atUtc:"2020-03-01T00:00:00Z"},
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({key:"route:A-B",count:3});
  });

  it("labels observable transcript form changes without deception labels",()=>{
    const out=detectResponsePatternShifts([
      {turnId:"1",topicKey:"background",text:"This is a long ordinary answer with several words in it today.",counselIntervened:false},
      {turnId:"2",topicKey:"background",text:"Another ordinary answer with several words explaining a harmless synthetic detail.",counselIntervened:false},
      {turnId:"3",topicKey:"topic-x",text:"I do not recall.",counselIntervened:false},
    ],2);
    expect(out[0]).toMatchObject({turnId:"3",recallLanguage:true});
    expect(JSON.stringify(out[0])).not.toMatch(/guilt|lie|fear|motive/i);
  });
});
