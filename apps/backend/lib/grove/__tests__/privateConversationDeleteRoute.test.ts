import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const mock = vi.hoisted(() => ({
  delete: vi.fn(), features: vi.fn(),
}));
vi.mock("@/lib/grove/privateReadBroker", () => ({
  deletePrivateGroveConversation: mock.delete,
}));
vi.mock("@/lib/grove/privateConversationLoop", () => ({
  grovePrivateTurnFeatures: mock.features,
}));
import { POST } from "@/app/api/grove/chat/conversations/delete/route";
const scope = {
  projectId: "00000000-0000-4000-8000-000000000003",
  conversationId: "00000000-0000-4000-8000-000000000005",
  confirmation: "DELETE",
};
const request = (body: unknown, headers?: Record<string,string>) => new Request(
  "https://grove-private.example.org/api/grove/chat/conversations/delete",
  { method:"POST",
    headers:{ "Content-Type":"application/json",authorization:"Bearer synthetic",...headers },
    body:typeof body === "string" ? body : JSON.stringify(body) },
);
beforeEach(() => {
  vi.stubEnv("GROVE_PRIVATE_CONVERSATION_DELETE_ENABLED", "true");
  mock.features.mockReturnValue({chatEnabled:true,transcriptEnabled:true,claimEnabled:true});
  mock.delete.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("explicit Grove-only saved conversation deletion", () => {
  it("is invisible before all three live flags and owner-delete approval", async () => {
    for (const setting of [
      {chatEnabled:false,transcriptEnabled:true,claimEnabled:true},
      {chatEnabled:true,transcriptEnabled:false,claimEnabled:true},
      {chatEnabled:true,transcriptEnabled:true,claimEnabled:false},
    ]) {
      mock.features.mockReturnValue(setting);
      expect((await POST(request(scope))).status).toBe(404);
    }
    mock.features.mockReturnValue({chatEnabled:true,transcriptEnabled:true,claimEnabled:true});
    vi.stubEnv("GROVE_PRIVATE_CONVERSATION_DELETE_ENABLED", "");
    expect((await POST(request(scope))).status).toBe(404);
    expect(mock.delete).not.toHaveBeenCalled();
  });
  it("requires exact explicit confirmation, one scoped project and no spoofed owner",async()=>{
    for (const payload of [
      {...scope,confirmation:"yes"}, {...scope,confirmation:true},
      {...scope,ownerId:"00000000-0000-4000-8000-000000000007"},
      {projectId:scope.projectId,confirmation:"DELETE"},
      {conversationId:scope.conversationId,confirmation:"DELETE"},
      {...scope,history:["untrusted"]},
    ]) {
      expect((await POST(request(payload))).status).toBe(400);
    }
    expect(mock.delete).not.toHaveBeenCalled();
  });
  it("delegates valid user intent to the existing server-owned broker",async()=>{
    const res=await POST(request(scope));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok:true,deleted:true,projectId:scope.projectId,
      conversationId:scope.conversationId,
      scope:"grove_saved_transcript_only",grantsExecution:false,verifiesCompletion:false,
    });
    expect(mock.delete).toHaveBeenCalledTimes(1);
    expect(mock.delete.mock.calls[0].slice(1)).toEqual([
      scope.projectId,scope.conversationId,
    ]);
  });
  it("does not treat a denied or unconfirmed database deletion as success",async()=>{
    for (const status of [403,404,500] as const){
      mock.delete.mockRejectedValueOnce(
        new RouteAccessError(status,"grove_private_delete_rejected"));
      const res=await POST(request(scope));
      expect(res.status).toBe(status);
      expect((await res.json()).deleted).toBeUndefined();
    }
    mock.delete.mockRejectedValueOnce(new Error("database failure secret"));
    const res=await POST(request(scope));
    expect(res.status).toBe(503);
    const response=await res.text();
    expect(response).not.toContain("secret");
    expect(response).not.toContain("deleted\":true");
  });
  it("requires JSON and denies oversized bodies before broker calls",async()=>{
    expect((await POST(request(scope,{"Content-Type":"text/plain"}))).status).toBe(415);
    expect((await POST(request("x".repeat(1100)))).status).toBe(413);
    expect(mock.delete).not.toHaveBeenCalled();
  });
});
