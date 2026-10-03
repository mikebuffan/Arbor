import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({context:vi.fn(),project:vi.fn(),conversation:vi.fn(),read:vi.fn()}));
vi.mock("@/lib/mcp/context",()=>({arkMcpUserContext:mocks.context}));
vi.mock("@/lib/auth/ownership",()=>({assertProjectOwnedByUser:mocks.project,assertConversationOwnedByUser:mocks.conversation}));
vi.mock("@/lib/memory/readRecall",()=>({readArborMemoryRecall:mocks.read}));
import {registerArkReadTools} from "../registerArkReadTools";
function tool(){const registerTool=vi.fn();registerArkReadTools({registerTool} as never);return registerTool.mock.calls.find(c=>c[0]==="get_arbor_memory_recall")!;}
beforeEach(()=>{vi.clearAllMocks();mocks.context.mockReturnValue({userId:"owner",supabase:{}});mocks.project.mockResolvedValue(undefined);mocks.conversation.mockResolvedValue(undefined);mocks.read.mockResolvedValue({archive:{totalTurns:42,turns:[]}});});
describe("owned read-only memory connector",()=>{
  it("scopes reads to the authenticated owner and returns the actual receipt",async()=>{
    const result=await tool()[2]({projectId:"project",conversationId:"thread",query:"archive question"},{});
    expect(mocks.read).toHaveBeenCalledWith({userId:"owner",supabase:{},projectId:"project",conversationId:"thread",query:"archive question"});
    expect(result.structuredContent.archive).toEqual({totalTurns:42,turns:[]});
  });
  it.each(["project","conversation"])("denies foreign %s before recall",async scope=>{
    mocks[scope as "project"|"conversation"].mockRejectedValue(new Error("foreign"));
    await expect(tool()[2]({projectId:"project",conversationId:"thread",query:"archive"},{})).rejects.toThrow("foreign");
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("advertises read-only bounded queries",()=>{
    const config=tool()[1];expect(config.annotations).toMatchObject({readOnlyHint:true,destructiveHint:false,openWorldHint:false});
    const projectId="9366c350-5d82-49f5-b9ef-862af750e3a0";
    expect(config.inputSchema.safeParse({projectId,query:" "}).success).toBe(false);
    expect(config.inputSchema.safeParse({projectId,query:"x".repeat(2001)}).success).toBe(false);
    expect(config.inputSchema.safeParse({projectId,query:"archive question"}).success).toBe(true);
  });
});
