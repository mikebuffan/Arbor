import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function proposal() {
  return fs.readFileSync(
    path.resolve(
      process.cwd(),
      "../../docs/research/sql/PROPOSED_arbor_research_sessions.sql",
    ),
    "utf8",
  );
}

describe("research controller append SQL contract", () => {
  it("defines one bounded service-role append RPC with owner/project scope", () => {
    const sql = proposal();
    const normalized = sql.toLowerCase().replace(/\s+/g, " ");

    expect(normalized).toContain(
      "create or replace function public.arbor_append_research_units( p_session_id uuid,p_user_id uuid,p_project_id uuid,p_units jsonb ) returns jsonb language plpgsql security invoker",
    );
    expect(normalized).toContain(
      "where id=p_session_id and user_id=p_user_id and project_id=p_project_id for update",
    );
    expect(normalized).toContain(
      "if v_requested not between 1 and 8 then",
    );
    expect(normalized).toContain(
      "if v_pending + v_requested > 256 then",
    );
    expect(normalized).toContain(
      "on conflict (session_id,unit_key) do nothing",
    );
    expect(normalized).toContain(
      "set unresolved_required_work=unresolved_required_work+v_appended",
    );
    expect(normalized).toContain(
      "revoke all on function public.arbor_append_research_units(uuid,uuid,uuid,jsonb) from public,anon,authenticated;",
    );
    expect(normalized).toContain(
      "grant execute on function public.arbor_append_research_units(uuid,uuid,uuid,jsonb) to service_role;",
    );

    const appendStart = normalized.indexOf(
      "create or replace function public.arbor_append_research_units",
    );
    const claimStart = normalized.indexOf(
      "create or replace function public.arbor_claim_research_unit",
    );
    const appendBody = normalized.slice(appendStart, claimStart);

    expect(appendBody).toContain("security invoker");
    expect(appendBody).not.toContain("security definer");
    expect(appendBody).toContain("research_session_not_appendable");
    expect(appendBody).toContain("duplicate_research_append_unit");
    expect(appendBody).toContain("research_controller_pending_unit_limit");
  });

  it("keeps append accounting based only on newly inserted units", () => {
    const normalized = proposal().toLowerCase().replace(/\s+/g, " ");
    const appendStart = normalized.indexOf(
      "create or replace function public.arbor_append_research_units",
    );
    const claimStart = normalized.indexOf(
      "create or replace function public.arbor_claim_research_unit",
    );
    const appendBody = normalized.slice(appendStart, claimStart);

    expect(appendBody).toContain("get diagnostics v_appended = row_count;");
    expect(appendBody).toContain(
      "'existing',v_requested-v_appended",
    );
    expect(appendBody).not.toContain(
      "unresolved_required_work=unresolved_required_work+v_requested",
    );
  });
});
