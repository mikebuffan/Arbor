# Live migration reconciliation — 2026-09-28

**Scope:** read-only/live-ledger reconciliation plus the separately owner-approved Firefly view hardening already recorded in Supabase migration history. This file is not permission to reset, squash, rename, or replay live migrations.

## Repository baseline

- Repository: `mikebuffan/Arbor`
- Current `main` observed SHA: `d46f6b46fc51ac3db4e158cddfc592c52cc2b5ef`
- Current main migration-file count: **29**
- GitHub reports `main` branch protection: **disabled**
- Repository rulesets observed: **none**
- Because live database histories have advanced beyond this tree, current `main` must **not** be treated as a fresh-schema reconstruction source.

### Main migration files

- `20260823175536_firefly_public_baseline.sql`
- `20260823175539_firefly_storage_attachment_policies_baseline.sql`
- `20260823175543_milestone_1b_attachment_scope.sql`
- `20260829070348_fix_attachment_scoped_metadata_policy.sql`
- `20260910204000_arbor_agency_strategy_candidates.sql`
- `20260910_arbor_linear_runtime.sql`
- `20260911033524_arbor_runtime_state.sql`
- `20260911174750_backend_closeout_hardening.sql`
- `20260914203500_restore_longitudinal_retrieval.sql`
- `20260914235500_recover_legacy_durable_memory_scope.sql`
- `20260915001000_restore_memory_signal_ledger.sql`
- `20260915033600_restore_pattern_memory.sql`
- `20260915035200_remove_legacy_match_memories_v3.sql`
- `20260916090000_add_pattern_hop_research_state.sql`
- `20260916091000_add_historical_pattern_hop_match.sql`
- `20260916101500_pattern_hop_resume_dedup.sql`
- `20260916102500_pattern_hop_rls.sql`
- `20260916103000_pattern_hop_fk_indexes.sql`
- `20260916104000_historical_turn_import_dedupe.sql`
- `20260918013000_arbor_durable_parent_objective.sql`
- `20260918014500_arbor_agency_compare_and_swap.sql`
- `20260918020000_arbor_agency_checkpoint_history.sql`
- `20260918021500_arbor_agency_idempotency.sql`
- `20260918023000_arbor_agency_first_claim.sql`
- `20260918024500_arbor_agency_idempotency_update_policy.sql`
- `20260918030000_arbor_autonomous_work_runner.sql`
- `20260918143000_create_ark_autonomous_work_runner.sql`
- `20260918203000_ark_targeted_objective_claim.sql`
- `20260918210000_ark_owner_integrity.sql`

## Firefly — live Supabase

- Project ref: `ncpdlyakrzfvobmwzbon`
- Live migration count: **55**
- Latest owner-approved security fix: `20260928220331_harden_investigation_read_views`
- Exact live migration versions not represented by a same-version file on current main: **47**

### Live ledger

- `20260823175536_firefly_public_baseline`
- `20260823175539_firefly_storage_attachment_policies_baseline`
- `20260823175543_milestone_1b_attachment_scope`
- `20260829070348_fix_attachment_scoped_metadata_policy`
- `20260910_arbor_linear_runtime`
- `20260910204000_arbor_agency_strategy_candidates`
- `20260911033524_arbor_runtime_state`
- `20260911174750_backend_closeout_hardening`
- `20260914202803_restore_project_scoped_memory_vector_retrieval`
- `20260914203051_add_historical_conversation_recall`
- `20260914203107_add_historical_turn_position`
- `20260914203249_preserve_import_source_lineage`
- `20260914203548_include_historical_turn_position_in_match_rpc`
- `20260914231939_memory_conversation_scope_isolation`
- `20260915000041_recover_legacy_durable_memory_scope`
- `20260915001407_restore_memory_signal_ledger`
- `20260915033704_restore_pattern_memory_layer`
- `20260915033925_normalize_legacy_global_memory_ownership`
- `20260915035124_remove_legacy_match_memories_v3_signature`
- `20260915060801_fix_memory_conversation_scope_isolation`
- `20260916144658_add_pattern_hop_research_state`
- `20260916144839_add_historical_pattern_hop_match`
- `20260916150531_pattern_hop_resume_dedup`
- `20260916150735_pattern_hop_rls`
- `20260916151345_pattern_hop_fk_indexes`
- `20260916153720_historical_turn_import_dedupe`
- `20260917041820_investigation_runner_core`
- `20260917042122_arbor_investigation_task_leases`
- `20260917042131_arbor_investigation_claim_finish_functions`
- `20260917042204_enable_pg_net_for_investigation_worker`
- `20260917042229_arbor_investigation_worker_auth`
- `20260917042531_align_investigation_worker_lease_status`
- `20260917042540_fix_investigation_claim_status`
- `20260917042554_extend_investigation_task_status_constraint`
- `20260917043157_investigation_worker_guardrails`
- `20260917044031_investigation_source_registry`
- `20260917044043_investigation_claims_entities`
- `20260917044102_investigation_verification_findings`
- `20260917045808_investigation_relationship_event_layer`
- `20260917045818_investigation_fk_indexes`
- `20260917045832_investigation_read_views`
- `20260917191412_create_arbor_knowledge_vault`
- `20260917191950_arbor_vault_corpus_and_search_v3`
- `20260917192421_arbor_vault_enable_rls`
- `20260917192549_arbor_vault_security_hardening`
- `20260917192658_arbor_vault_access_and_indexes`
- `20260917192759_arbor_vault_recall_and_promotion`
- `20260917201002_arbor_vault_runtime_integration_v1`
- `20260918023245_arbor_durable_parent_objective`
- `20260918023504_arbor_checkpointed_agency_status`
- `20260918065406_arbor_agency_compare_and_swap`
- `20260918065438_arbor_agency_checkpoint_history`
- `20260918065511_arbor_agency_idempotency`
- `20260920185511_ark_production_forward_bundle_20260920_verified_restore`
- `20260928220331_harden_investigation_read_views`

### Same-version files missing from current main

- `20260914202803_restore_project_scoped_memory_vector_retrieval`
- `20260914203051_add_historical_conversation_recall`
- `20260914203107_add_historical_turn_position`
- `20260914203249_preserve_import_source_lineage`
- `20260914203548_include_historical_turn_position_in_match_rpc`
- `20260914231939_memory_conversation_scope_isolation`
- `20260915000041_recover_legacy_durable_memory_scope`
- `20260915001407_restore_memory_signal_ledger`
- `20260915033704_restore_pattern_memory_layer`
- `20260915033925_normalize_legacy_global_memory_ownership`
- `20260915035124_remove_legacy_match_memories_v3_signature`
- `20260915060801_fix_memory_conversation_scope_isolation`
- `20260916144658_add_pattern_hop_research_state`
- `20260916144839_add_historical_pattern_hop_match`
- `20260916150531_pattern_hop_resume_dedup`
- `20260916150735_pattern_hop_rls`
- `20260916151345_pattern_hop_fk_indexes`
- `20260916153720_historical_turn_import_dedupe`
- `20260917041820_investigation_runner_core`
- `20260917042122_arbor_investigation_task_leases`
- `20260917042131_arbor_investigation_claim_finish_functions`
- `20260917042204_enable_pg_net_for_investigation_worker`
- `20260917042229_arbor_investigation_worker_auth`
- `20260917042531_align_investigation_worker_lease_status`
- `20260917042540_fix_investigation_claim_status`
- `20260917042554_extend_investigation_task_status_constraint`
- `20260917043157_investigation_worker_guardrails`
- `20260917044031_investigation_source_registry`
- `20260917044043_investigation_claims_entities`
- `20260917044102_investigation_verification_findings`
- `20260917045808_investigation_relationship_event_layer`
- `20260917045818_investigation_fk_indexes`
- `20260917045832_investigation_read_views`
- `20260917191412_create_arbor_knowledge_vault`
- `20260917191950_arbor_vault_corpus_and_search_v3`
- `20260917192421_arbor_vault_enable_rls`
- `20260917192549_arbor_vault_security_hardening`
- `20260917192658_arbor_vault_access_and_indexes`
- `20260917192759_arbor_vault_recall_and_promotion`
- `20260917201002_arbor_vault_runtime_integration_v1`
- `20260918023245_arbor_durable_parent_objective`
- `20260918023504_arbor_checkpointed_agency_status`
- `20260918065406_arbor_agency_compare_and_swap`
- `20260918065438_arbor_agency_checkpoint_history`
- `20260918065511_arbor_agency_idempotency`
- `20260920185511_ark_production_forward_bundle_20260920_verified_restore`
- `20260928220331_harden_investigation_read_views`

## Firefly ARK Preview — live Supabase

- Project ref: `tzbpjbhroxiqftqwatnb`
- Live migration count: **34**
- Same-version live migrations absent from current main: **5**

### Live ledger

- `20260823175536_firefly_public_baseline`
- `20260823175539_firefly_storage_attachment_policies_baseline`
- `20260823175543_milestone_1b_attachment_scope`
- `20260829070348_fix_attachment_scoped_metadata_policy`
- `20260910_arbor_linear_runtime`
- `20260910204000_arbor_agency_strategy_candidates`
- `20260911033524_arbor_runtime_state`
- `20260911174750_backend_closeout_hardening`
- `20260914203500_restore_longitudinal_retrieval`
- `20260914235500_recover_legacy_durable_memory_scope`
- `20260915001000_restore_memory_signal_ledger`
- `20260915033600_restore_pattern_memory`
- `20260915035200_remove_legacy_match_memories_v3`
- `20260916090000_add_pattern_hop_research_state`
- `20260916091000_add_historical_pattern_hop_match`
- `20260916101500_pattern_hop_resume_dedup`
- `20260916102500_pattern_hop_rls`
- `20260916103000_pattern_hop_fk_indexes`
- `20260916104000_historical_turn_import_dedupe`
- `20260918013000_arbor_durable_parent_objective`
- `20260918014500_arbor_agency_compare_and_swap`
- `20260918020000_arbor_agency_checkpoint_history`
- `20260918021500_arbor_agency_idempotency`
- `20260918023000_arbor_agency_first_claim`
- `20260918024500_arbor_agency_idempotency_update_policy`
- `20260918030000_arbor_autonomous_work_runner`
- `20260918143000_create_ark_autonomous_work_runner`
- `20260918203000_ark_targeted_objective_claim`
- `20260918210000_ark_owner_integrity`
- `20260925155744_ark_preview_restore_targeted_claim_scope`
- `20260927163212_ark_preview_research_queue_only`
- `20260927163445_restore_ark_targeted_claim_after_retracted_queue_gate`
- `20260928190315_ark_preview_research_submit_rpc`
- `20260928190851_arbor_continuity_snapshot_rpc`

### Same-version files missing from current main

- `20260925155744_ark_preview_restore_targeted_claim_scope`
- `20260927163212_ark_preview_research_queue_only`
- `20260927163445_restore_ark_targeted_claim_after_retracted_queue_gate`
- `20260928190315_ark_preview_research_submit_rpc`
- `20260928190851_arbor_continuity_snapshot_rpc`

## The Grove — live Supabase

- Project ref: `fqjqpuaoifgbweiguacf`
- Live migration count: **1**
- Current live tables remain owner-access / Firefly-bridge / ARK-project-grant only; transcript and retry-claim proposals are not live.
- Current live auth/grant counts observed during audit: 0 auth users / 0 owner grants / 0 Firefly bridges / 0 ARK project grants.

### Live ledger

- `20260922035539_grove_private_owner_access`

## Reconciliation rule

Version mismatch does **not** automatically mean missing semantics: several historical lanes used equivalent or consolidated migration names/versions. Therefore the next migration closeout must compare actual DDL/functions/policies, not blindly copy filenames.

Before any fresh environment or migration cleanup:

1. map each live migration to exact source commit/branch or an explicit recovered SQL receipt;
2. identify semantic duplicates/consolidations;
3. preserve already-applied live version history;
4. create only forward migrations for real gaps;
5. verify RLS/privileges and exact live schema after each forward repair;
6. do not merge product lanes merely to make migration counts look equal.

## Open hardening

- GitHub `main` is currently unprotected and there are no repository rulesets. Add reviewed branch-protection/ruleset policy before treating `main` as a release integration target.
- Firefly advisor's prior five `security_definer_view` errors are resolved by migration `20260928220331_harden_investigation_read_views`.
- Remaining RLS-with-no-policy INFO findings are not automatically defects: RLS with no policy is default-deny for ordinary client roles. Review privileged paths before adding any policy.
- Extension-schema and leaked-password-protection WARNs remain separate hardening items.
