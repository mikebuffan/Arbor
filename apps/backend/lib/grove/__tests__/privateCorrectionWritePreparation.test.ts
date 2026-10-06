import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { preparePrivateCorrectionSave, type PrivateCorrectionScope } from "../privateCorrectionWritePreparation";
import { createCorrection } from "@/lib/arbor/runtime/corrections";
const scope: PrivateCorrectionScope = {
 groveUserId: "00000000-0000-4000-8000-000000000001",
 fireflyUserId: "00000000-0000-4000-8000-000000000002",
 projectId: "00000000-0000-4000-8000-000000000003",
 conversationId: "00000000-0000-4000-8000-000000000004",
};
const correction = createCorrection({ value: "Don't wait; keep going", kind: "behavior", source: "text", observedAt: "2026-10-06T00:00:00Z" });
const input = { scope, requestId: "00000000-0000-4000-8000-000000000005", currentUserText: "Remember this: don't wait; keep going", corrections: [correction] };
const supabase = {} as SupabaseClient;
describe("private correction write preparation", () => {
 it("holds without a distinct write verifier", async () => {
  const stage=vi.fn();expect(await preparePrivateCorrectionSave(input,{supabase,stage})).toEqual({status:"held",permanent:false});expect(stage).not.toHaveBeenCalled();
 });
 it.each(Object.keys(scope) as (keyof PrivateCorrectionScope)[])("holds for foreign %s", async key => {
  const stage=vi.fn();const foreign={...scope,[key]:input.requestId};
  expect((await preparePrivateCorrectionSave(input,{supabase,stage,authorizeCorrectionWrite:async()=>foreign})).status).toBe("held");expect(stage).not.toHaveBeenCalled();
 });
 it("holds revoked authority", async () => {
  const stage=vi.fn();expect((await preparePrivateCorrectionSave(input,{supabase,stage,authorizeCorrectionWrite:async()=>null})).status).toBe("held");expect(stage).not.toHaveBeenCalled();
 });
 it("does not infer durable permission from ordinary feedback", async () => {
  const stage=vi.fn(), authorizeCorrectionWrite=vi.fn(async()=>scope);
  expect((await preparePrivateCorrectionSave({...input,currentUserText:"You're too formal"},{supabase,stage,authorizeCorrectionWrite})).status).toBe("not_requested");expect(stage).not.toHaveBeenCalled();expect(authorizeCorrectionWrite).not.toHaveBeenCalled();
 });
 it("passes stable UUID and mapped owner to the existing writer", async () => {
  const stage=vi.fn(async()=>[correction]);
  expect(await preparePrivateCorrectionSave(input,{supabase,stage,authorizeCorrectionWrite:async()=>scope})).toEqual({status:"staged",permanent:false});
  expect(stage).toHaveBeenCalledWith({supabase,userId:scope.fireflyUserId,projectId:scope.projectId,conversationId:scope.conversationId,userMessageId:input.requestId,currentUserText:input.currentUserText,corrections:[correction]});
 });
 it("propagates failed save, then retries the same UUID", async () => {
  const stage=vi.fn().mockRejectedValueOnce(new Error("save_failed")).mockResolvedValue([correction]);const deps={supabase,stage,authorizeCorrectionWrite:async()=>scope};
  await expect(preparePrivateCorrectionSave(input,deps)).rejects.toThrow("save_failed");await preparePrivateCorrectionSave(input,deps);
  expect(stage.mock.calls.map(([arg])=>arg.userMessageId)).toEqual([input.requestId,input.requestId]);
 });
 it("rejects invalid request IDs before writes", async () => {
  const stage=vi.fn();await expect(preparePrivateCorrectionSave({...input,requestId:"new-random-id"},{supabase,stage,authorizeCorrectionWrite:async()=>scope})).rejects.toThrow("invalid_request");expect(stage).not.toHaveBeenCalled();
 });
});
