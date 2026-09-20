import { describe, expect, it, vi } from "vitest";
import { registerArkReadTools } from "../registerArkReadTools";

describe("ARK MCP tool boundary", () => {
  it("registers only explicitly read-only tools", () => {
    const registerTool = vi.fn();
    registerArkReadTools({ registerTool } as never);

    expect(registerTool).toHaveBeenCalledTimes(4);
    expect(registerTool.mock.calls.map(([name]) => name)).toEqual([
      "get_arbor_profile",
      "list_arbor_projects",
      "get_ark_status",
      "get_arbor_continuity",
    ]);

    for (const [, config] of registerTool.mock.calls) {
      expect(config.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
      expect(config.inputSchema).toBeDefined();
      expect(config.outputSchema).toBeDefined();
    }
  });
});
