import { describe, expect, it } from "vitest";
import { createCorrection } from "../corrections";
import {
  mergeCorrections,
  mergeCorrectionSnapshots,
  type ArborCorrection,
} from "../runtimeState";

const timestamp="2026-10-10T11:10:00.000Z";
const record=(observationId:string,time=timestamp):ArborCorrection =>
  createCorrection({
    value:"Why did you stop? Keep going.",
    source:"text",observedAt:time,
    observationId,
  } as Parameters<typeof createCorrection>[0]);

describe("B11/C08 correction observation identity across retries and snapshots",()=>{
  it("preserves host supplied message ID, not a generated per-retry ID",()=>{
    const item=record("message:owner:001");
    expect(item.observationIds).toEqual(["message:owner:001"]);
    expect(item.occurrences).toBe(1);
    const retry=record("message:owner:001","2026-10-10T12:12:00.000Z");
    const merged=mergeCorrections([item],[retry]);
    expect(merged[0].occurrences).toBe(1);
    expect(merged[0].observationIds).toEqual(["message:owner:001"]);
  });

  it("counts two real different message IDs even at identical timestamp",()=>{
    const one=record("message:owner:101");
    const two=record("message:owner:102");
    const merged=mergeCorrections([one],[two]);
    expect(merged[0].occurrences).toBe(2);
    expect(merged[0].observationIds).toEqual([
      "message:owner:101","message:owner:102",
    ]);
    expect(mergeCorrections(merged,[two])[0].occurrences).toBe(2);
  });

  it("unions distinct known IDs across copied snapshots, without adding duplicate overlap",()=>{
    const first=mergeCorrections([record("message:owner:101")],[record("message:owner:102")]);
    const second=mergeCorrections([record("message:owner:102")],[record("message:owner:103")]);
    const recovered=mergeCorrectionSnapshots([[first[0]],[second[0]],[first[0]]]);
    expect(recovered).toHaveLength(1);
    expect(recovered[0].occurrences).toBe(3);
    expect(recovered[0].observationIds).toEqual([
      "message:owner:101","message:owner:102","message:owner:103",
    ]);
    expect(mergeCorrectionSnapshots([recovered,recovered])).toEqual(recovered);
  });

  it("preserves legacy aggregate baseline while counting only new identified observations",()=>{
    const legacy:{observationIds?:string[];occurrences?:number} & ArborCorrection={
      ...record("message:owner:dummy"), occurrences:2,
    };
    delete legacy.observationIds;
    delete legacy.legacyOccurrences;
    const first=mergeCorrections([legacy],[record("message:owner:201")]);
    expect(first[0].occurrences).toBe(3);
    expect(first[0].legacyOccurrences).toBe(2);
    const second=mergeCorrections(first,[record("message:owner:202")]);
    expect(second[0].occurrences).toBe(4);
    expect(second[0].observationIds).toEqual([
      "message:owner:201","message:owner:202",
    ]);
    expect(mergeCorrectionSnapshots([[legacy],second,second])[0].occurrences).toBe(4);
  });

  it("rejects forged malformed saved observation identity rather than treating it as new",()=>{
    const first=record("message:owner:001");
    expect(()=>mergeCorrections([first],[
      {...record("message:owner:002"),observationIds:[" "]},
    ])).toThrow("arbor_correction_invalid_observation_ids");
    expect(()=>mergeCorrectionSnapshots([[
      {...first,observationIds:["message:owner:001","message:owner:001"]},
    ]])).toThrow("arbor_correction_invalid_observation_ids");
  });

  it("keeps an unkeyed historical retry conservative and never auto-promotes a correction",()=>{
    const older={...record("message:owner:dummy"),occurrences:2} as ArborCorrection;
    delete older.observationIds;
    delete older.legacyOccurrences;
    const copied={...older,observedAt:"2026-10-10T11:12:00.000Z"};
    const merged=mergeCorrectionSnapshots([[older],[copied]]);
    expect(merged[0].occurrences).toBe(2);
    expect(merged[0].observationIds).toBeUndefined();
    expect(merged[0].legacyOccurrences).toBeUndefined();
  });
});
