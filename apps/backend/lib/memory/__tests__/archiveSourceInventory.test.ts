import {describe, expect, it} from "vitest";
import {inventoryChatGPTConversationGraph as inspect} from "../../../scripts/import_chatgpt/archiveSourceInventory";
import {parseConversationObject} from "../../../scripts/import_chatgpt/parseChatGPT";

const node = (id: string, parent: string | null, role = "user", parts: unknown[] = ["hello"]) =>
  ({parent, message: {id, author: {role}, create_time: 1, content: {parts}}});

describe("opt-in archive graph coverage inventory, synthetic metadata only", () => {
  it("counts active and alternate message nodes without changing the active importer", () => {
    const fixture = {id: "synthetic-thread", current_node: "latest", mapping: {
      root: node("root", null),
      latest: node("latest", "root"),
      alt: node("alt", "root", "assistant", [{asset_pointer: "synthetic://unapproved", payload: "private"}]),
      tool: node("tool", "alt", "tool"),
    }};
    expect(inspect(fixture)).toMatchObject({
      graphNodes: 4, mappedMessages: 4, activePathNodes: 2, alternateNodes: 2,
      activeMessages: 2, alternateMessages: 2, alternateStructuredPartMessages: 1,
      alternatePointerHints: 1, unsupportedRoleMessages: 1,
      graphStructureValid: true, graphMetadataComplete: true,
      mediaBytesRead: false, contentBodiesReturned: false, writes: false,
    });
    expect(parseConversationObject(fixture).map(turn => turn.sourceMessageId)).toEqual(["root", "latest"]);
    expect(JSON.stringify(inspect(fixture))).not.toContain("synthetic://");
  });

  it("reports UNKNOWN alternate coverage if the current branch is absent", () => {
    const report = inspect({current_node: "missing", mapping: {root: node("root", null)}});
    expect(report.activePathNodes).toBeNull();
    expect(report.alternateNodes).toBeNull();
    expect(report.graphMetadataComplete).toBe(false);
  });

  it("rejects full-graph completeness when an unused alternate branch has a missing parent", () => {
    const report = inspect({current_node: "root", mapping: {
      root: node("root", null), alt: node("alt", "not-present"),
    }});
    expect(report).toMatchObject({
      activePathValid: true, graphStructureValid: false,
      graphMetadataComplete: false, missingParentLinks: 1, alternateNodes: 1,
    });
  });

  it("detects cycles on unused alternate branches and invalid non-string parents", () => {
    const cyclic = inspect({current_node: "root", mapping: {
      root: node("root", null), a: node("a", "b"), b: node("b", "a"),
    }});
    expect(cyclic.parentCycles).toBe(1);
    expect(cyclic.graphMetadataComplete).toBe(false);
    const invalid = inspect({current_node: "root", mapping: {
      root: node("root", null), alternate: {parent: 19, message: null},
    }});
    expect(invalid.invalidParentLinks).toBe(1);
    expect(invalid.graphMetadataComplete).toBe(false);
  });

  it("does not dereference a media pointer or emit its value", () => {
    let dereferenced = false;
    const media = Object.defineProperty({payload: "private"}, "asset_pointer", {
      enumerable: true, get() {dereferenced = true; throw Error("must not touch pointer");},
    });
    const report = inspect({current_node: "root", mapping: {
      root: node("root", null, "user", [media]),
    }});
    expect(report.activePointerHints).toBe(1);
    expect(dereferenced).toBe(false);
    expect(report).toMatchObject({mediaBytesRead: false, contentBodiesReturned: false, writes: false});
    expect(JSON.stringify(report)).not.toContain("private");
  });

  it("counts duplicate mapped message IDs without returning protected identifiers", () => {
    const report = inspect({current_node: "root", mapping: {
      root: node("same-private-id", null),
      alternate: node("same-private-id", null),
    }});
    expect(report.duplicateMappedMessageIds).toBe(1);
    expect(report.graphMetadataComplete).toBe(true);
    expect(JSON.stringify(report)).not.toContain("same-private-id");
  });
});
