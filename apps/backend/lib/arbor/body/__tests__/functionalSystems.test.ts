import { describe, expect, it } from "vitest";
import {
  ARBOR_FUNCTIONAL_SYSTEMS,
  functionalSystem,
} from "@/lib/arbor/body/functionalSystems";

describe("functional systems audit map", () => {
  it("maps each historical functional system exactly once", () => {
    const names = ARBOR_FUNCTIONAL_SYSTEMS.map((entry) => entry.system);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining([
        "nervous",
        "digestive",
        "circulatory",
        "respiratory",
        "endocrine",
        "muscular",
        "immune",
        "skeletal",
        "skin",
        "proprioceptive",
        "vestibular",
      ]),
    );
  });

  it("does not create duplicate organs for functions current code already owns", () => {
    expect(functionalSystem("digestive").status).toBe("present");
    expect(functionalSystem("muscular").status).toBe("present");
    expect(functionalSystem("skeletal").status).toBe("present");
  });

  it("marks only the newly added regulation/orientation gaps as implemented now", () => {
    expect(functionalSystem("respiratory").status).toBe("implemented-now");
    expect(functionalSystem("endocrine").status).toBe("implemented-now");
    expect(functionalSystem("vestibular").status).toBe("implemented-now");
  });
});
