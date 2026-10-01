import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseInvestigationIntegrityStore } from "./supabaseInvestigationIntegrityStore";

const context = {
  claimId: "87878787-8787-4787-8787-878787878787",
  claimText: "Synthetic act occurred.",
  assertionKind: "established_act",
  support: [{
    id: "85858585-8585-4585-8585-858585858581",
    evidenceClass: "PRIMARY_RECORD",
    sourceRef: "synthetic:court-record:1",
    lineageKey: "synthetic:court-record:1",
    content: "Synthetic primary record.",
    contentSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    supports: ["established_act"],
    underlyingSourceRef: null,
  }],
  counterEvidenceRefs: [
    "85858585-8585-4585-8585-858585858582",
  ],
  unresolvedContradictionIds: ["synthetic-conflict"],
  falsificationAttempts: [{
    id: "90909090-9090-4090-8090-909090909090",
    hypothesis: "Counterevidence defeats the claim.",
    result: "survived",
    evidenceRefs: [
      "85858585-8585-4585-8585-858585858582",
    ],
  }],
  negativeEvidence: null,
};

function database(data: unknown = context) {
  const rpc = vi.fn(async () => ({ data, error: null }));
  return {
    db: { rpc } as unknown as SupabaseClient,
    rpc,
  };
}

describe("Supabase investigation integrity store", () => {
  it("loads only the exact trusted owner/project/claim scope", async () => {
    const m = database();
    const store = new SupabaseInvestigationIntegrityStore(
      m.db,
      "owner-1",
      "project-1",
    );

    await expect(store.loadFindingContext({
      ownerId: "owner-1",
      projectId: "project-1",
      claimId: "87878787-8787-4787-8787-878787878787",
    })).resolves.toMatchObject({
      claimId: "87878787-8787-4787-8787-878787878787",
      assertionKind: "established_act",
      support: [{
        evidenceClass: "PRIMARY_RECORD",
        supports: ["established_act"],
      }],
      counterEvidenceRefs: [
        "85858585-8585-4585-8585-858585858582",
      ],
      unresolvedContradictionIds: ["synthetic-conflict"],
      falsificationAttempts: [{
        result: "survived",
      }],
    });

    expect(m.rpc).toHaveBeenCalledWith(
      "arbor_load_investigation_finding_context",
      {
        p_claim_id: "87878787-8787-4787-8787-878787878787",
        p_user_id: "owner-1",
        p_project_id: "project-1",
      },
    );
  });

  it("rejects a caller attempting to cross trusted owner/project scope", async () => {
    const m = database();
    const store = new SupabaseInvestigationIntegrityStore(
      m.db,
      "owner-1",
      "project-1",
    );

    await expect(store.loadFindingContext({
      ownerId: "other-owner",
      projectId: "project-1",
      claimId: "87878787-8787-4787-8787-878787878787",
    })).rejects.toThrow("investigation_integrity_store_scope_mismatch");

    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("returns null only when the scoped RPC returns no claim", async () => {
    const m = database(null);
    const store = new SupabaseInvestigationIntegrityStore(
      m.db,
      "owner-1",
      "project-1",
    );

    await expect(store.loadFindingContext({
      ownerId: "owner-1",
      projectId: "project-1",
      claimId: "missing-claim",
    })).resolves.toBeNull();
  });

  it("fails closed if the RPC returns a different claim id", async () => {
    const m = database({
      ...context,
      claimId: "different-claim",
    });
    const store = new SupabaseInvestigationIntegrityStore(
      m.db,
      "owner-1",
      "project-1",
    );

    await expect(store.loadFindingContext({
      ownerId: "owner-1",
      projectId: "project-1",
      claimId: "87878787-8787-4787-8787-878787878787",
    })).rejects.toThrow("investigation_integrity_store_claim_mismatch");
  });

  it("fails closed on malformed evidence class instead of repairing it", async () => {
    const m = database({
      ...context,
      support: [{
        ...context.support[0],
        evidenceClass: "NEWS_BUT_PROBABLY_TRUE",
      }],
    });
    const store = new SupabaseInvestigationIntegrityStore(
      m.db,
      "owner-1",
      "project-1",
    );

    await expect(store.loadFindingContext({
      ownerId: "owner-1",
      projectId: "project-1",
      claimId: context.claimId,
    })).rejects.toThrow(
      "invalid_investigation_integrity_db_evidence_class",
    );
  });

  it("fails closed on malformed assertion/support arrays", async () => {
    const badRows = [
      { ...context, assertionKind: "probably_true" },
      {
        ...context,
        support: [{
          ...context.support[0],
          supports: ["established_act", "made_up_kind"],
        }],
      },
      {
        ...context,
        counterEvidenceRefs: ["counter-1", 42],
      },
      {
        ...context,
        unresolvedContradictionIds: null,
      },
    ];

    for (const row of badRows) {
      const m = database(row);
      const store = new SupabaseInvestigationIntegrityStore(
        m.db,
        "owner-1",
        "project-1",
      );
      await expect(store.loadFindingContext({
        ownerId: "owner-1",
        projectId: "project-1",
        claimId: context.claimId,
      })).rejects.toThrow(/invalid_investigation_integrity_db_/);
    }
  });

  it("requires proof for persisted PROVEN_ABSENT state", async () => {
    const m = database({
      ...context,
      negativeEvidence: {
        state: "PROVEN_ABSENT",
        scope: "synthetic official registry",
        proofRef: null,
      },
    });
    const store = new SupabaseInvestigationIntegrityStore(
      m.db,
      "owner-1",
      "project-1",
    );

    await expect(store.loadFindingContext({
      ownerId: "owner-1",
      projectId: "project-1",
      claimId: context.claimId,
    })).rejects.toThrow(
      "invalid_investigation_integrity_db_negative_evidence_proof_ref",
    );
  });

  it("propagates database errors rather than inventing missing context", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "synthetic database failure" },
    }));
    const store = new SupabaseInvestigationIntegrityStore(
      { rpc } as unknown as SupabaseClient,
      "owner-1",
      "project-1",
    );

    await expect(store.loadFindingContext({
      ownerId: "owner-1",
      projectId: "project-1",
      claimId: context.claimId,
    })).rejects.toMatchObject({
      message: "synthetic database failure",
    });
  });
});
