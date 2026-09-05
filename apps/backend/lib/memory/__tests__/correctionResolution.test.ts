import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const loggerMocks = vi.hoisted(() => ({
  logMemoryEvent: vi.fn().mockResolvedValue(undefined),
}));

const memoryMocks = vi.hoisted(() => ({
  applyMemoryCorrection: vi.fn(),
  supersedeMemoryAliases: vi.fn(),
  upsertMemoryItems: vi.fn(),
}));

vi.mock("@/lib/memory/logger", () => ({
  logMemoryEvent: loggerMocks.logMemoryEvent,
}));
vi.mock("@/lib/memory/store", () => ({
  supersedeMemoryAliases: memoryMocks.supersedeMemoryAliases,
  upsertMemoryItems: memoryMocks.upsertMemoryItems,
}));
vi.mock("@/lib/memory/applyCorrection", () => ({
  applyMemoryCorrection: memoryMocks.applyMemoryCorrection,
}));

import {
  classifyMemoryTurn,
  parseExplicitMemoryCorrection,
  persistClassifiedMemoryTurn,
  resolveExplicitCorrection,
  semanticMemoryKey,
  type CorrectionCandidate,
} from "@/lib/memory/correctionResolution";
import type { MemoryItem } from "@/lib/memory/types";

const userId = "11111111-1111-4111-8111-111111111111";
const projectA = "22222222-2222-4222-8222-222222222222";
const projectB = "33333333-3333-4333-8333-333333333333";
const emptySupabase = {} as SupabaseClient;

function candidate(
  overrides: Partial<CorrectionCandidate> = {},
): CorrectionCandidate {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    user_id: userId,
    project_id: projectA,
    key: "project.observatory.access_phrase",
    value: { value: "Silver Orchard" },
    tier: "normal",
    scope: "project",
    importance: 8,
    confidence: 0.99,
    pinned: false,
    locked: false,
    correction_count: 0,
    status: "active",
    deleted_at: null,
    created_at: "2026-09-01T21:55:10.629052-07:00",
    ...overrides,
  };
}

const explicitText =
  "Correction: the access phrase is Blue Lantern, not Silver Orchard.";

function correction() {
  const parsed = parseExplicitMemoryCorrection(explicitText);
  if (!parsed) throw new Error("test correction did not parse");
  return parsed;
}

describe("explicit conversational memory correction", () => {
  it("distinguishes an ordinary assertion from an explicit correction", () => {
    const item = {
      key: "project.observatory.access_phrase",
      value: "Silver Orchard",
      tier: "normal",
      scope: "project",
      user_trigger_only: false,
      importance: 8,
      confidence: 0.99,
    } satisfies MemoryItem;

    expect(
      classifyMemoryTurn({
        userText: "Remember that the phrase is Silver Orchard.",
        extractedItems: [item],
      }),
    ).toEqual({ kind: "assertion", items: [item] });
    expect(
      classifyMemoryTurn({
        userText: explicitText,
        extractedItems: [{ ...item, value: "Blue Lantern" }],
      }),
    ).toMatchObject({
      kind: "correction",
      correction: {
        subject: "access phrase",
        correctedValue: "Blue Lantern",
        oldValue: "Silver Orchard",
        scopeHint: "current_project",
      },
    });
  });

  it("resolves a same-key correction using exact old value and injection evidence", () => {
    const target = candidate();
    expect(
      resolveExplicitCorrection({
        userId,
        projectId: projectA,
        correction: correction(),
        candidates: [target],
        injectedMemoryIds: [target.id],
      }),
    ).toEqual({
      status: "resolved",
      canonical: target,
      staleAliases: [],
    });
  });

  it("normalizes the observed extractor key drift into one semantic fact", () => {
    expect(semanticMemoryKey("project.observatory.access_phrase")).toBe(
      "access.observatory.phrase",
    );
    expect(
      semanticMemoryKey("project.fictional_observatory.access_phrase"),
    ).toBe("access.observatory.phrase");
    expect(
      semanticMemoryKey("project.observatory.fictional.access_phrase"),
    ).toBe("access.observatory.phrase");
  });

  it("reproduces the live four-row failure and converges through the canonical key", async () => {
    const canonical = candidate({
      id: "0c02aa13-be53-41b4-96d5-bada0fe9be0d",
    });
    const name = candidate({
      id: "f3c7440f-b572-4ee8-8a1e-97c403e2a722",
      key: "project.observatory.name",
      value: { value: "Marrowglass" },
      importance: 7,
    });
    const duplicate = candidate({
      id: "9ffbe093-0a30-4f78-89c8-f1f1678dd96a",
      key: "project.fictional_observatory.access_phrase",
      importance: 6,
      confidence: 0.7,
      created_at: "2026-09-01T21:56:05.53894-07:00",
    });
    const driftedCorrection: MemoryItem = {
      key: "project.observatory.fictional.access_phrase",
      value: { value: "Blue Lantern" },
      tier: "normal",
      scope: "project",
      user_trigger_only: false,
      importance: 7,
      confidence: 0.95,
    };
    const applyCorrection = vi.fn().mockResolvedValue({
      id: canonical.id,
      locked: false,
    });
    const supersedeAliases = vi
      .fn()
      .mockResolvedValue([duplicate.id]);
    const upsertItems = vi.fn();

    const result = await persistClassifiedMemoryTurn(
      {
        supabase: emptySupabase,
        userId,
        projectId: projectA,
        classified: classifyMemoryTurn({
          userText: explicitText,
          extractedItems: [driftedCorrection],
        }),
        injectedMemoryIds: [canonical.id, name.id, duplicate.id],
      },
      {
        loadCandidates: vi
          .fn()
          .mockResolvedValue([canonical, name, duplicate]),
        applyCorrection,
        supersedeAliases,
        upsertItems,
      },
    );

    expect(result.kind).toBe("correction");
    expect(result.resolution).toMatchObject({
      status: "resolved",
      canonical: { id: canonical.id, key: canonical.key },
      staleAliases: [{ id: duplicate.id }],
    });
    expect(applyCorrection).toHaveBeenCalledWith({
      supabase: emptySupabase,
      userId,
      projectId: projectA,
      key: "project.observatory.access_phrase",
      correctedValue: "Blue Lantern",
    });
    expect(supersedeAliases).toHaveBeenCalledWith({
      supabase: emptySupabase,
      authedUserId: userId,
      projectId: projectA,
      canonicalId: canonical.id,
      aliases: [{ id: duplicate.id, key: duplicate.key }],
    });
    expect(upsertItems).not.toHaveBeenCalled();
  });

  it("does not let an assistant paraphrase manufacture an authoritative correction fact", async () => {
    const target = candidate();
    const applyCorrection = vi.fn().mockResolvedValue({
      id: target.id,
      locked: false,
    });
    const upsertItems = vi.fn();

    await persistClassifiedMemoryTurn(
      {
        supabase: emptySupabase,
        userId,
        projectId: projectA,
        classified: classifyMemoryTurn({
          userText: explicitText,
          extractedItems: [
            {
              key: "project.observatory.real.access_phrase",
              value: { value: "Assistant-invented distinction" },
              tier: "core",
              scope: "global",
              user_trigger_only: false,
              importance: 10,
              confidence: 1,
            },
          ],
        }),
        injectedMemoryIds: [target.id],
      },
      {
        loadCandidates: vi.fn().mockResolvedValue([target]),
        applyCorrection,
        supersedeAliases: vi.fn().mockResolvedValue([]),
        upsertItems,
      },
    );

    expect(applyCorrection).toHaveBeenCalledWith(
      expect.objectContaining({
        key: target.key,
        correctedValue: "Blue Lantern",
      }),
    );
    expect(upsertItems).not.toHaveBeenCalled();
  });

  it("fails conservatively when exact-value candidates describe different facts", () => {
    const observatory = candidate();
    const door = candidate({
      id: "55555555-5555-4555-8555-555555555555",
      key: "project.door.access_phrase",
    });

    expect(
      resolveExplicitCorrection({
        userId,
        projectId: projectA,
        correction: correction(),
        candidates: [observatory, door],
        injectedMemoryIds: [observatory.id, door.id],
      }),
    ).toEqual({
      status: "ambiguous",
      canonical: null,
      staleAliases: [],
    });
  });

  it("cannot correct another user or another project", () => {
    const foreignProject = candidate({ project_id: projectB });
    const foreignUser = candidate({
      id: "66666666-6666-4666-8666-666666666666",
      user_id: "77777777-7777-4777-8777-777777777777",
    });

    expect(
      resolveExplicitCorrection({
        userId,
        projectId: projectA,
        correction: correction(),
        candidates: [foreignProject, foreignUser],
        injectedMemoryIds: [foreignProject.id, foreignUser.id],
      }).status,
    ).toBe("not_found");
  });

  it("does not cross global and project scope silently", () => {
    const global = candidate({
      project_id: null,
      scope: "global",
    });
    expect(
      resolveExplicitCorrection({
        userId,
        projectId: projectA,
        correction: correction(),
        candidates: [global],
        injectedMemoryIds: [global.id],
      }).status,
    ).toBe("not_found");

    const globalCorrection = {
      ...correction(),
      scopeHint: "global" as const,
    };
    expect(
      resolveExplicitCorrection({
        userId,
        projectId: projectA,
        correction: globalCorrection,
        candidates: [global],
        injectedMemoryIds: [global.id],
      }).status,
    ).toBe("resolved");
  });

  it("requires an actually injected old-value target", () => {
    const target = candidate();
    expect(
      resolveExplicitCorrection({
        userId,
        projectId: projectA,
        correction: correction(),
        candidates: [target],
        injectedMemoryIds: [],
      }).status,
    ).toBe("not_injected");
  });

  it("preserves a single locked row as the canonical target", () => {
    const older = candidate();
    const locked = candidate({
      id: "88888888-8888-4888-8888-888888888888",
      key: "project.observatory.fictional.access_phrase",
      locked: true,
      correction_count: 2,
      importance: 10,
    });
    const result = resolveExplicitCorrection({
      userId,
      projectId: projectA,
      correction: correction(),
      candidates: [older, locked],
      injectedMemoryIds: [older.id, locked.id],
    });

    expect(result).toMatchObject({
      status: "resolved",
      canonical: { id: locked.id },
      staleAliases: [{ id: older.id }],
    });
  });
});
