export const previewResearchSqlOrder = [
  "docs/research/sql/PROPOSED_arbor_research_sessions.sql",
  "docs/research/sql/PROPOSED_epstein_ingestion_verification_v1.sql",
  "docs/research/sql/PROPOSED_epstein_corpus_intelligence_v2.sql",
  "docs/research/sql/PROPOSED_epstein_investigation_workbench_v3.sql",
  "docs/research/sql/PROPOSED_epstein_reproducibility_scale_v4.sql",
  "docs/research/sql/PROPOSED_epstein_security_hardening_v5.sql",
  "docs/research/sql/PROPOSED_epstein_preview_integration_v6.sql",
] as const;

export type PreviewIntegrationObservedState={
  projectRef:string;
  projectName:string;
  existingResearchTables:readonly string[];
  existingResearchFunctions:readonly string[];
  migrationNames:readonly string[];
};

export type PreviewIntegrationPreflight={
  projectRef:string;
  target:"preview_only";
  readyForReviewedSchemaApply:boolean;
  blockers:readonly string[];
  orderedSqlFiles:typeof previewResearchSqlOrder;
  executionFlags:{
    executionEnabled:false;
    schedulerEnabled:false;
    realSourceIngestionEnabled:false;
    publicationEnabled:false;
  };
};

const req=(v:unknown,k:string,max=500):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_preview_integration_"+k);
  return v.trim();
};

export function previewIntegrationPreflight(input:PreviewIntegrationObservedState):PreviewIntegrationPreflight{
  const projectRef=req(input.projectRef,"project_ref",120);
  const projectName=req(input.projectName,"project_name",200);
  const existingResearchTables=[...new Set(input.existingResearchTables.map(x=>req(x,"existing_table",300)))].sort();
  const existingResearchFunctions=[...new Set(input.existingResearchFunctions.map(x=>req(x,"existing_function",300)))].sort();
  const migrationNames=[...new Set(input.migrationNames.map(x=>req(x,"migration_name",300)))].sort();
  const blockers:string[]=[];
  if(!/preview/i.test(projectName))blockers.push("target_is_not_named_preview");
  if(existingResearchTables.length)blockers.push("research_tables_already_exist");
  if(existingResearchFunctions.length)blockers.push("research_functions_already_exist");
  if(migrationNames.some(name=>/epstein|research_security_hardening|corpus_intelligence|investigation_workbench/i.test(name)))
    blockers.push("research_migration_name_collision");
  return {
    projectRef,target:"preview_only",readyForReviewedSchemaApply:blockers.length===0,blockers,
    orderedSqlFiles:previewResearchSqlOrder,
    executionFlags:{executionEnabled:false,schedulerEnabled:false,realSourceIngestionEnabled:false,publicationEnabled:false},
  };
}

export type PreviewRollbackReceipt={
  receiptId:string;
  targetProjectRef:string;
  appliedMigrationNames:readonly string[];
  preApplyMigrationHead:string;
  forwardRevertRequired:true;
  destructiveRollbackAllowed:false;
  dataIngested:false;
  executionEverEnabled:false;
};

export function createPreviewRollbackReceipt(input:PreviewRollbackReceipt):PreviewRollbackReceipt{
  const receiptId=req(input.receiptId,"rollback_receipt_id",300);
  const targetProjectRef=req(input.targetProjectRef,"rollback_project_ref",120);
  const preApplyMigrationHead=req(input.preApplyMigrationHead,"migration_head",300);
  const appliedMigrationNames=[...new Set(input.appliedMigrationNames.map(x=>req(x,"applied_migration_name",300)))];
  if(input.forwardRevertRequired!==true||input.destructiveRollbackAllowed!==false||
     input.dataIngested!==false||input.executionEverEnabled!==false)
    throw new Error("invalid_preview_rollback_safety_state");
  return {receiptId,targetProjectRef,appliedMigrationNames,preApplyMigrationHead,
    forwardRevertRequired:true,destructiveRollbackAllowed:false,dataIngested:false,executionEverEnabled:false};
}
