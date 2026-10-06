import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseInvestigationObservationStore } from "./supabaseInvestigationObservationStore";

const OWNER = "11111111-1111-4111-8111-111111111111";
const PROJECT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EVIDENCE = "85858585-8585-4585-8585-858585858581";

function db(data: unknown, error: unknown = null) {
  const rpc = vi.fn(async () => ({ data, error }));
  return {
    rpc,
    client: { rpc } as unknown as SupabaseClient,
  };
}

describe("scoped Supabase investigation observation store", () => {
  it("loads only through the owner/project-scoped trusted RPC", async () => {
    const m = db([{
      evidenceRef: EVIDENCE,
      lineageKey: "lineage:primary-1",
      documentFamily: "calendar",
      occurredAt: "2026-01-01T10:00:00Z",
      eventTags: ["scheduled"],
      entities: [{
        id: "entity:resolved:1",
        label: "Synthetic Entity",
        kind: "company",
      }],
    }]);
    const store = new SupabaseInvestigationObservationStore(
      m.client,
      OWNER,
      PROJECT,
    );

    await expect(store.loadObservations({
      ownerId: OWNER,
      projectId: PROJECT,
      evidenceRefs: [EVIDENCE],
    })).resolves.toEqual([{
      evidenceRef: EVIDENCE,
      lineageKey: "lineage:primary-1",
      documentFamily: "calendar",
      occurredAt: "2026-01-01T10:00:00Z",
      eventTags: ["scheduled"],
      entities: [{
        id: "entity:resolved:1",
        label: "Synthetic Entity",
        kind: "company",
      }],
    }]);

    expect(m.rpc).toHaveBeenCalledWith(
      "arbor_load_investigation_observations",
      {
        p_evidence_ids: [EVIDENCE],
        p_user_id: OWNER,
        p_project_id: PROJECT,
      },
    );
  });

  it("rejects cross-owner or cross-project use before querying", async () => {
    const m = db([]);
    const store = new SupabaseInvestigationObservationStore(
      m.client,
      OWNER,
      PROJECT,
    );

    await expect(store.loadObservations({
      ownerId: "22222222-2222-4222-8222-222222222222",
      projectId: PROJECT,
      evidenceRefs: [EVIDENCE],
    })).rejects.toThrow("investigation_observation_store_scope_mismatch");

    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("requires persisted UUID evidence ids instead of arbitrary model refs", async () => {
    const m = db([]);
    const store = new SupabaseInvestigationObservationStore(
      m.client,
      OWNER,
      PROJECT,
    );

    await expect(store.loadObservations({
      ownerId: OWNER,
      projectId: PROJECT,
      evidenceRefs: ["news:some-story"],
    })).rejects.toThrow(
      "investigation_observation_store_invalid_evidence_refs",
    );
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("fails closed on malformed entity kinds", async () => {
    const m = db([{
      evidenceRef: EVIDENCE,
      lineageKey: "lineage:primary-1",
      documentFamily: "calendar",
      occurredAt: null,
      eventTags: [],
      entities: [{
        id: "entity:1",
        label: "Synthetic",
        kind: "mystery_person_type",
      }],
    }]);
    const store = new SupabaseInvestigationObservationStore(
      m.client,
      OWNER,
      PROJECT,
    );

    await expect(store.loadObservations({
      ownerId: OWNER,
      projectId: PROJECT,
      evidenceRefs: [EVIDENCE],
    })).rejects.toThrow(
      "investigation_observation_store_invalid_entity_kind",
    );
  });

  it("fails closed on non-array RPC responses", async () => {
    const m = db({ bad: true });
    const store = new SupabaseInvestigationObservationStore(
      m.client,
      OWNER,
      PROJECT,
    );

    await expect(store.loadObservations({
      ownerId: OWNER,
      projectId: PROJECT,
      evidenceRefs: [EVIDENCE],
    })).rejects.toThrow(
      "investigation_observation_store_invalid_response",
    );
  });
});
