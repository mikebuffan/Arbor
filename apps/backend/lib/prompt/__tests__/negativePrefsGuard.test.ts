import { describe, it, expect } from "vitest";
import fs from "fs";
import { fileURLToPath } from "node:url";

describe("buildPromptContext negative prefs guard", () => {
  it("contains NEGATIVE_PREFS_GUARD language", () => {
    const filePath = fileURLToPath(new URL("../buildPromptContext.ts", import.meta.url));
    const src = fs.readFileSync(filePath, "utf8");

    expect(src).toMatch(/NEGATIVE_PREFS_GUARD/);
    expect(src).toMatch(/Do not call user/);
    expect(src).toMatch(/Never use forbidden names\/titles/);
  });
});
