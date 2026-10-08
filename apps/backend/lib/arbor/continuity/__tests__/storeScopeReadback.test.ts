import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  agency: vi.fn(async () => null),
  subsystem: vi.fn(async () => ({activeSubsystem:"arbor",voiceId:"cedar",acousticCorrections:[]})),
}));
vi.mock("@/lib/arbor/agency/state", () => ({ loadAgencyState: mocks.agency }));
vi.mock("@/lib/arbor/subsystem/state", () => ({ loadSubsystemState: mocks.subsystem }));
import { loadContinuityState } from "../store";

const userId="synthetic-owner",projectId="synthetic-project",conversationId="synthetic-conversation";
const row=(role: string, content: unknown, overrides: Record<string, unknown> = {}) => ({
  user_id:userId,project_id:projectId,conversation_id:conversationId,
  role,content,created_at:"2026-10-08T12:00:00Z",
  deleted_at:null,expires_at:null,...overrides
});
function client(currentRows: unknown[], fallbackRows: unknown[]) {
  const calls: Array<Array<[string, unknown]>>=[];
  const from=vi.fn((table: string) => {
    if (table !== "messages") throw Error("unexpected table");
    const filters: Array<[string, unknown]>=[];
    const query: any={};
    query.select=vi.fn(() => query);
    query.eq=(field: string,value: unknown) => {filters.push([field,value]);return query;};
    query.is=()=>query;
    query.or=()=>query;
    query.order=()=>query;
    query.limit=async () => {
      calls.push(filters);
      return {data:filters.some(([key])=>key==="conversation_id")?currentRows:fallbackRows,error:null};
    };
    return query;
  });
  return {supabase:{from} as never,calls};
}
const input={userId,projectId,conversationId,channel:"text" as const};

describe("B10 continuity scope and stale-content readback",()=>{
  it("drops returned foreign, deleted, expired, malformed and other-conversation rows",async()=>{
    const rows=[
      row("user","My authorized goal"),
      row("assistant","My authorized prior response"),
      row("user","SECRET-OWNER",{user_id:"someone-else"}),
      row("assistant","SECRET-PROJECT",{project_id:"other-project"}),
      row("assistant","SECRET-CONVERSATION",{conversation_id:"another-conversation"}),
      row("assistant","SECRET-DELETED",{deleted_at:"2026-10-08T09:00:00Z"}),
      row("assistant","SECRET-EXPIRED",{expires_at:"2000-01-01T00:00:00Z"}),
      row("assistant","SECRET-BAD-EXPIRY",{expires_at:"not-a-date"}),
      row("assistant",["SECRET-BAD-CONTENT"]),
      row("system","SECRET-SYSTEM"),
    ];
    const db=client(rows,[]);
    const state=await loadContinuityState({...input,supabase:db.supabase});
    expect(state.lastMeaningfulUserTurn).toBe("My authorized goal");
    expect(state.lastMeaningfulArborTurn).toBe("My authorized prior response");
    expect(JSON.stringify(state)).not.toContain("SECRET");
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0]).toContainEqual(["conversation_id",conversationId]);
  });

  it("preserves intended project fallback, but denies foreign project rows",async()=>{
    const db=client(
      [row("user","Current conversation goal"),
       row("assistant","SECRET-FOREIGN",{project_id:"foreign-project"})],
      [row("assistant","Earlier project-safe response",{conversation_id:"prior-in-project"}),
       row("assistant","SECRET-OTHER-PROJECT",{project_id:"other-project",conversation_id:"other"})]
    );
    const state=await loadContinuityState({...input,supabase:db.supabase});
    expect(state.lastMeaningfulUserTurn).toBe("Current conversation goal");
    expect(state.lastMeaningfulArborTurn).toBe("Earlier project-safe response");
    expect(db.calls).toHaveLength(2);
    expect(db.calls[1].some(([key])=>key==="conversation_id")).toBe(false);
  });

  it("fails closed rather than rendering a malformed provider collection",async()=>{
    const db=client(null as never,[]);
    const state=await loadContinuityState({...input,supabase:db.supabase});
    expect(state.lastMeaningfulUserTurn).toBeNull();
    expect(state.lastMeaningfulArborTurn).toBeNull();
  });

  it("keeps a valid future-expiring message eligible",async()=>{
    const db=client([row("user","Future safe message",{expires_at:"2100-01-01T00:00:00Z"}),
      row("assistant","Future safe answer")],[]);
    const state=await loadContinuityState({...input,supabase:db.supabase});
    expect(state.lastMeaningfulUserTurn).toBe("Future safe message");
    expect(state.lastMeaningfulArborTurn).toBe("Future safe answer");
  });
});
