import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({save:vi.fn()}));
vi.mock("../privateCorrectionWrite",()=>({savePrivateGroveCorrection:mocks.save}));
import { POST } from "@/app/api/grove/corrections/route";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
const body={projectId:"00000000-0000-4000-8000-000000000001",conversationId:"00000000-0000-4000-8000-000000000002",
  requestId:"00000000-0000-4000-8000-000000000003",text:"Remember this: keep going"};
const req=(value:unknown=body,type="application/json")=>new Request("https://grove.example.org/api/grove/corrections",{
  method:"POST",headers:{"content-type":type},body:typeof value==="string"?value:JSON.stringify(value)});
beforeEach(()=>{vi.stubEnv("GROVE_API_ENABLED","true");vi.stubEnv("GROVE_PRIVATE_CORRECTION_WRITE_ENABLED","true");mocks.save.mockResolvedValue({status:"staged",permanent:false});});
afterEach(()=>vi.unstubAllEnvs());
describe("explicit Grove correction route",()=>{
  it.each(["GROVE_API_ENABLED","GROVE_PRIVATE_CORRECTION_WRITE_ENABLED"])("stays off before parsing when %s is off",async flag=>{
    vi.stubEnv(flag,"false");expect((await POST(req("bad"))).status).toBe(404);expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not claim staged corrections are permanent",async()=>{
    const response=await POST(req());expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ok:true,status:"staged",permanent:false,grantsExecution:false,verifiesCompletion:false});
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.save).toHaveBeenCalledWith({...body,request:expect.any(Request)});
  });
  it("reports saved only when the connection confirms readback",async()=>{
    mocks.save.mockResolvedValue({status:"saved",permanent:true});expect((await POST(req())).status).toBe(200);
  });
  it.each([{...body,fireflyUserId:body.projectId},{...body,corrections:[]},{...body,requestId:"random"},{...body,text:""}])("rejects caller-supplied authority and malformed scope %j",async value=>{
    expect((await POST(req(value))).status).toBe(400);expect(mocks.save).not.toHaveBeenCalled();
  });
  it("limits bytes while reading the stream",async()=>{expect((await POST(req("x".repeat(13000)))).status).toBe(413);expect(mocks.save).not.toHaveBeenCalled();});
  it("accepts bounded UTF-8 text",async()=>{expect((await POST(req({...body,text:"😀".repeat(1400)}))).status).toBe(202);});
  it("requires JSON and handles invalid JSON",async()=>{expect((await POST(req(body,"text/plain"))).status).toBe(415);expect((await POST(req("{"))).status).toBe(400);});
  it("preserves permission denial without leaking provider failures",async()=>{
    mocks.save.mockRejectedValueOnce(new RouteAccessError(403,"grove_correction_write_not_granted"));expect((await POST(req())).status).toBe(403);
    mocks.save.mockRejectedValueOnce(new Error("secret provider details"));const r=await POST(req());expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain("secret");
  });
});
