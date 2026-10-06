import { searchOwnedResearchPages, type DocumentHopSearch } from "./researchDocumentSearch";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEvidencePacket, type EvidencePacket } from "./evidencePacketBuilder";
import { createInvestigationReplayReceipt, type InvestigationReplayRecipe } from "./investigationReplayReceipt";

type JsonObject=Record<string,unknown>;

function req(value:unknown,field:string,max=1000):string{
  if(typeof value!=="string"||!value.trim()||value.length>max)throw new Error("invalid_investigation_store_"+field);
  return value.trim();
}
function row(value:unknown):JsonObject{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("invalid_investigation_store_response");
  return value as JsonObject;
}

/**
 * Server/service-role adapter only.
 *
 * Owner/project are resolved by trusted server authorization at construction.
 * Payload methods never accept owner_id/project_id, preventing a caller from
 * selecting a different tenant through this API.
 */
export class SupabaseInvestigationStore{
  constructor(
    private readonly db:SupabaseClient,
    private readonly ownerId:string,
    private readonly projectId:string,
  ){
    req(ownerId,"owner_id");
    req(projectId,"project_id");
  }

  private async insertOne(table:string,data:JsonObject):Promise<string>{
    const query=this.db.from(table).insert({
      ...data,owner_id:this.ownerId,project_id:this.projectId,
    }).select("id").single();
    const {data:result,error}=await query;
    if(error)throw error;
    return req(row(result).id,"inserted_id");
  }

  async recordReplayRecipe(recipe:InvestigationReplayRecipe):Promise<{
    id:string;recipeSha256:string;
  }>{
    const receipt=await createInvestigationReplayReceipt(recipe);
    const id=await this.insertOne("arbor_research_replay_receipts",{
      recipe_key:receipt.recipe.recipeId,
      recipe_sha256:receipt.recipeSha256,
      canonical_recipe_json:JSON.parse(receipt.canonicalRecipeJson) as JsonObject,
      code_version:receipt.recipe.codeVersion,
      status:receipt.status,
    });
    return {id,recipeSha256:receipt.recipeSha256};
  }

  async recordEvidencePacket(packetInput:EvidencePacket):Promise<string>{
    const packet=buildEvidencePacket(packetInput);
    return this.insertOne("arbor_research_evidence_packets_v4",{
      packet_key:packet.packetId,
      finding_ref:packet.findingRef,
      title:packet.title,
      replay_recipe_sha256:packet.replayRecipeSha256,
      sources:packet.sources,
      limitations:packet.limitations,
      unresolved_questions:packet.unresolvedQuestions,
      privacy_flag_ids:packet.privacyFlagIds,
      original_page_review_complete:packet.originalPageReviewComplete,
      status:packet.status,
    });
  }

  async recordSessionHandoff(input:{
    handoffKey:string;
    fromSessionId:string;
    toSessionId:string;
    reason:string;
    evidenceRefs:readonly string[];
  }):Promise<string>{
    const handoffKey=req(input.handoffKey,"handoff_key");
    const fromSessionId=req(input.fromSessionId,"from_session_id");
    const toSessionId=req(input.toSessionId,"to_session_id");
    if(fromSessionId===toSessionId)throw new Error("investigation_handoff_requires_distinct_sessions");
    const reason=req(input.reason,"handoff_reason",4000);
    const evidenceRefs=[...new Set(input.evidenceRefs.map(x=>req(x,"handoff_evidence_ref",1000)))].sort();
    return this.insertOne("arbor_research_session_handoffs",{
      handoff_key:handoffKey,
      from_session_id:fromSessionId,
      to_session_id:toSessionId,
      reason,evidence_refs:evidenceRefs,
      status:"recorded_no_execution",
    });
  }

  async searchPreparedPatternHopPages(input: DocumentHopSearch) {
    return searchOwnedResearchPages(this.db, this.ownerId, this.projectId, input);
  }

  async loadIntegrationState():Promise<{
    executionEnabled:false;
    schedulerEnabled:false;
    realSourceIngestionEnabled:false;
    publicationEnabled:false;
    schemaVersion:string;
  }|null>{
    const {data,error}=await this.db.from("arbor_research_integration_state")
      .select("owner_id,project_id,execution_enabled,scheduler_enabled,real_source_ingestion_enabled,publication_enabled,schema_version")
      .eq("owner_id",this.ownerId).eq("project_id",this.projectId).maybeSingle();
    if(error)throw error;
    if(!data)return null;
    const r=row(data);
    if(r.owner_id!==this.ownerId||r.project_id!==this.projectId)throw new Error("investigation_store_scope_mismatch");
    if(r.execution_enabled!==false||r.scheduler_enabled!==false||
       r.real_source_ingestion_enabled!==false||r.publication_enabled!==false)
      throw new Error("investigation_store_execution_gate_open");
    return {
      executionEnabled:false,schedulerEnabled:false,realSourceIngestionEnabled:false,publicationEnabled:false,
      schemaVersion:req(r.schema_version,"schema_version"),
    };
  }
}
