import { describe, expect, it, vi } from "vitest";
import { loadSubsystemState } from "../state";

const owner = "synthetic-owner";
const project = "synthetic-project";
function db(data: unknown, error: unknown = null) {
  const filters: Array<[string, unknown]> = [];
  const maybeSingle = vi.fn(async () => ({ data, error }));
  const q: any = {
    select: vi.fn(() => q),
    eq: (name: string, value: unknown) => { filters.push([name, value]); return q; },
    maybeSingle,
  };
  const from = vi.fn(() => q);
  return { supabase: { from } as never, filters, from };
}
const load = (supabase: ReturnType<typeof db>["supabase"]) =>
  loadSubsystemState({ supabase, userId: owner, projectId: project });

describe("Group 5 startup subsystem readback scope (synthetic)", () => {
  it("preserves properly scoped subsystem and corrections", async () => {
    const x = db({ user_id: owner, project_id: project,
      active_subsystem: "annabelle", voice_id: "invalid-voice",
      acoustic_corrections: ["  slow down  ", "General American", "", 5] });
    const state = await load(x.supabase);
    expect(state.activeSubsystem).toBe("annabelle");
    expect(state.acousticCorrections).toEqual(["slow down", "General American"]);
    expect(x.filters).toContainEqual(["user_id", owner]);
    expect(x.filters).toContainEqual(["project_id", project]);
  });

  it.each([
    { user_id: "foreign-user", project_id: project },
    { user_id: owner, project_id: "foreign-project" },
    { user_id: undefined, project_id: project },
    { user_id: owner, project_id: undefined },
  ])("rejects mismatched returned rows without injecting correction content: %j", async (scope) => {
    const x = db({ active_subsystem: "annabelle",
      acoustic_corrections: ["SECRET-FOREIGN-CORRECTION"], voice_id: "invalid",
      ...scope });
    const result = await load(x.supabase);
    expect(result.activeSubsystem).toBe("arbor");
    expect(JSON.stringify(result)).not.toContain("SECRET-FOREIGN");
  });

  it("never promotes malformed subsystem identifiers to active routing", async () => {
    const x = db({ user_id: owner, project_id: project,
      active_subsystem: "privileged-worker", voice_id: null,
      acoustic_corrections: [] });
    expect((await load(x.supabase)).activeSubsystem).toBe("arbor");
  });
});
