import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const executionSource = readFileSync(resolve(here, "../toolExecution.ts"), "utf8");

describe("agency recovery depth", () => {
  it("does not blindly replay reversible writes", () => {
    expect(executionSource).toContain('tool.risk !== "read"');
    expect(executionSource).toContain("Do not blindly replay incompatible arguments.");
  });

  it("keeps alternate-route recovery visible to the sustained agent loop", () => {
    expect(executionSource).toContain('recovery.kind === "alternate"');
    expect(executionSource).toContain("Use the named alternate capability next:");
    expect(executionSource).toContain("Choose another valid reversible route if one exists.");
  });
});
