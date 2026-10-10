import { describe, expect, it } from "vitest";
import { buildArborAgencyTools } from "../arborTools";
import {
  AgencyToolRegistry,
  toolNeedsUserBoundary,
} from "../tools";

describe("AgencyToolRegistry", () => {
  it("keeps independent-read certification trusted and absent from model schemas", () => {
    const registry = buildArborAgencyTools({ supabase: {} as never });
    const certified = registry.get("arbor_read_runtime_state");
    expect(certified.risk).toBe("read");
    expect(certified.mayRunBeforeProtectedBoundary).toBe(true);
    expect(registry.get("annabelle_set_working_delta").mayRunBeforeProtectedBoundary).toBeUndefined();
    const advertised = registry.openAIToolDefinitions().find(item => item.name === "arbor_read_runtime_state");
    expect(advertised).toBeDefined();
    expect(advertised).not.toHaveProperty("mayRunBeforeProtectedBoundary");
  });

  it("allows read and reversible-write capabilities through the agency loop", () => {
    const registry = new AgencyToolRegistry()
      .register({
        name: "read_state",
        description: "Read current state",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
          required: [],
        },
        risk: "read",
        async execute() {
          return { ok: true };
        },
      })
      .register({
        name: "save_draft",
        description: "Save a reversible draft",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
          required: [],
        },
        risk: "reversible_write",
        async execute() {
          return { ok: true };
        },
      });

    expect(registry.list().map((tool) => tool.name)).toEqual([
      "read_state",
      "save_draft",
    ]);
    expect(registry.list().some(toolNeedsUserBoundary)).toBe(false);
  });

  it("marks irreversible and high-consequence capabilities as boundaries", () => {
    expect(
      toolNeedsUserBoundary({
        name: "publish",
        description: "Publish",
        parameters: {},
        risk: "irreversible",
        async execute() {},
      }),
    ).toBe(true);

    expect(
      toolNeedsUserBoundary({
        name: "high_stakes",
        description: "High consequence",
        parameters: {},
        risk: "high_consequence",
        async execute() {},
      }),
    ).toBe(true);
  });
});
