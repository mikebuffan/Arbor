import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPreviewRollbackReceipt, previewIntegrationPreflight, previewResearchSqlOrder } from "./previewIntegrationPlan";
import { SupabaseInvestigationStore } from "./supabaseInvestigationStore";

function mockDb(){
  let nextId=0;
  const insert=vi.fn();
  const select=vi.fn();
  const single=vi.fn();
  const eq=vi.fn();
  const maybeSingle=vi.fn();

  const insertQuery:any={insert,select,single,eq,maybeSingle};
  insert.mockReturnValue(insertQuery);
  select.mockReturnValue(insertQuery);
  single.mockImplementation(async()=>({data:{id:"row-"+(++nextId)},error:null}));
  eq.mockReturnValue(insertQuery);
  maybeSingle.mockImplementation(async()=>({data:{
    owner_id:"owner-1",project_id:"project-1",
    execution_enabled:false,scheduler_enabled:false,
    real_source_ingestion_enabled:false,publication_enabled:false,
    schema_version:"v6-preview",
  },error:null}));

  const from=vi.fn(()=>insertQuery);
  return {db:{from} as unknown as SupabaseClient,from,insert,select,single,eq,maybeSingle};
}

describe("preview integration v6",()=>{
  it("allows a clean Preview preflight only when research schema/migrations are absent and flags stay off",()=>{
    const result=previewIntegrationPreflight({
      projectRef:"preview-ref",projectName:"Firefly ARK Preview",
      existingResearchTables:[],existingResearchFunctions:[],
      migrationNames:["ark_preview_research_submit_rpc","arbor_continuity_snapshot_rpc"],
    });
    expect(result.readyForReviewedSchemaApply).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.orderedSqlFiles).toEqual(previewResearchSqlOrder);
    expect(Object.values(result.executionFlags).every(v=>v===false)).toBe(true);
  });

  it("blocks a non-preview or collision state",()=>{
    expect(previewIntegrationPreflight({
      projectRef:"prod",projectName:"Firefly",
      existingResearchTables:["arbor_research_documents"],existingResearchFunctions:["arbor_claim_research_unit"],
      migrationNames:["epstein_research_v1"],
    }).blockers).toEqual(expect.arrayContaining([
      "target_is_not_named_preview","research_tables_already_exist",
      "research_functions_already_exist","research_migration_name_collision",
    ]));
  });

  it("creates forward-only rollback metadata with no data or execution",()=>{
    expect(createPreviewRollbackReceipt({
      receiptId:"rb-1",targetProjectRef:"preview-ref",
      appliedMigrationNames:["research_sessions","ingestion_v1"],
      preApplyMigrationHead:"annabelle_editorial_hardening",
      forwardRevertRequired:true,destructiveRollbackAllowed:false,
      dataIngested:false,executionEverEnabled:false,
    })).toMatchObject({forwardRevertRequired:true,destructiveRollbackAllowed:false,dataIngested:false,executionEverEnabled:false});
  });

  it("pins all persistence writes to the server-resolved owner/project",async()=>{
    const m=mockDb();
    const store=new SupabaseInvestigationStore(m.db,"owner-1","project-1");
    const replay=await store.recordReplayRecipe({
      recipeId:"recipe-1",corpusSnapshotRefs:["snap-1"],queryText:"synthetic query",filters:{},
      hopDirectives:[],resolverDecisions:[],codeVersion:"git:test",algorithmVersions:{},
      producedEvidenceRefs:["e1"],producedLeadRefs:[],
    });
    expect(replay.recipeSha256).toMatch(/^[a-f0-9]{64}$/);
    const inserted=m.insert.mock.calls[0][0];
    expect(inserted.owner_id).toBe("owner-1");
    expect(inserted.project_id).toBe("project-1");
    expect(m.from).toHaveBeenCalledWith("arbor_research_replay_receipts");
  });

  it("records handoffs without allowing same-session handoff or execution",async()=>{
    const m=mockDb();
    const store=new SupabaseInvestigationStore(m.db,"owner-1","project-1");
    await expect(store.recordSessionHandoff({
      handoffKey:"h1",fromSessionId:"s1",toSessionId:"s1",reason:"bad",evidenceRefs:["e1"],
    })).rejects.toThrow("investigation_handoff_requires_distinct_sessions");
    await store.recordSessionHandoff({
      handoffKey:"h2",fromSessionId:"s1",toSessionId:"s2",reason:"continue bounded synthetic review",
      evidenceRefs:["e1","e2"],
    });
    const inserted=m.insert.mock.calls.at(-1)?.[0];
    expect(inserted.status).toBe("recorded_no_execution");
    expect(inserted.owner_id).toBe("owner-1");
    expect(inserted.project_id).toBe("project-1");
  });

  it("loads only a fail-closed integration state scoped by owner/project",async()=>{
    const m=mockDb();
    const store=new SupabaseInvestigationStore(m.db,"owner-1","project-1");
    expect(await store.loadIntegrationState()).toEqual({
      executionEnabled:false,schedulerEnabled:false,realSourceIngestionEnabled:false,
      publicationEnabled:false,schemaVersion:"v6-preview",
    });
    expect(m.eq.mock.calls).toEqual([["owner_id","owner-1"],["project_id","project-1"]]);
  });
});
