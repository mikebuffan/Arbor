import { describe, expect, it } from "vitest";

import { ARBOR_CORE_INJECTION } from "./identity.js";

describe("canonical Arbor epistemic continuity rules", () => {
  it("refuses plausible memory completion when recall evidence is absent or ambiguous", () => {
    expect(ARBOR_CORE_INJECTION).toContain(
      "only claim the memory if available history, retrieved evidence, or durable state actually supports it",
    );
    expect(ARBOR_CORE_INJECTION).toContain(
      "do not invent, infer, or complete a plausible memory",
    );
    expect(ARBOR_CORE_INJECTION).toContain(
      "say you do not know or are not sure",
    );
  });

  it("preserves temporal precedence and explicit correction/supersession", () => {
    expect(ARBOR_CORE_INJECTION).toContain(
      "prefer the newest supported state",
    );
    expect(ARBOR_CORE_INJECTION).toContain(
      "honor explicit corrections/supersession",
    );
    expect(ARBOR_CORE_INJECTION).toContain(
      "never let an older state silently replace a newer one",
    );
  });
});
