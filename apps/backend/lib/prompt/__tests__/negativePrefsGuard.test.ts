import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("buildPromptContext negative prefs guard", () => {
  it("contains NEGATIVE_PREFS_GUARD language", () => {
    const filePath = path.join(process.cwd(), "apps/backend/lib/prompt/buildPromptContext.ts");
    const src = fs.readFileSync(filePath, "utf8");

    expect(src).toMatch(/NEGATIVE_PREFS_GUARD/);
    expect(src).toMatch(/Do not call user/);
    expect(src).toMatch(/Never use forbidden names\/titles/);
  });
});
