import { describe, expect, it } from "vitest";
import {
  mergeCorrections,
  mergeCorrectionSnapshots,
  type ArborCorrection,
} from "../runtimeState";
import { correctionPromotionItem } from "../correctionPromotion";
import { buildArborBehaviorProjection } from "../../behavior/behaviorProjection";
import {
  beginSelfUpdate,
  decideSelfUpdate,
  recordSelfUpdateVerification,
} from "../../agency/updateLifecycle";

const correction = (
  time: string, occurrences = 1,
): ArborCorrection => ({
  id: "behavior:agency-followthrough",
  kind: "behavior",
  value: "Keep going instead of requiring another GO.",
  source: "text", observedAt: time,
  confidence: 1, protected: true, occurrences,
});
const now = "2026-10-10T09:00:00.000Z";
const prior = "2026-10-10T08:00:00.000Z";
const later = "2026-10-10T08:01:00.000Z";
const rule = correction(prior).value;
const behavior = buildArborBehaviorProjection({
  mode: "text", correctionRules: [rule],
}).proof;
const baseline = () => beginSelfUpdate({
  id: "fixture-correction-learning",
  strategy: "continue and verify rather than request repeated permission",
  baselineScore: 0.2,
  behavior,
  protectedCorrections: [rule],
  now,
});

describe("reopened B11 / C08 / D12 correction and learning chain", () => {
  it("does not mistake a later cumulative correction snapshot for three extra feedback events", () => {
    const saved = correction(prior, 2);
    const freshSnapshot = correction(later, 3);
    const merged = mergeCorrections([saved], [freshSnapshot]);
    // The newer snapshot includes the earlier two observations.
    // Without distinct event identities, treating 2 + 3 as five is invented proof.
    expect(merged).toHaveLength(1);
    expect(merged[0].occurrences).toBe(3);
    expect(merged[0].observedAt).toBe(later);
    expect(mergeCorrectionSnapshots([[saved], [freshSnapshot]])[0].occurrences).toBe(3);
  });

  it("still recognizes actual new single feedback without counting its replay", () => {
    const original = correction(prior);
    const distinct = correction(later);
    const twice = mergeCorrections([original], [distinct]);
    expect(twice[0].occurrences).toBe(2);
    const replay = mergeCorrections(twice, [distinct]);
    expect(replay[0].occurrences).toBe(2);
    const restored = mergeCorrectionSnapshots([twice, replay]);
    expect(restored[0].occurrences).toBe(2);
  });

  it("cannot turn copied correction history or replayed verifier IDs into learning proof", () => {
    const saved = correction(prior, 2);
    const copied = correction(later, 3);
    const merged = mergeCorrections([saved], [copied]);
    expect(merged[0].occurrences).toBe(3);
    // The source only yields an eligible candidate. Global promotion still
    // needs explicit owner authorization and a separate durable readback.
    const candidate = correctionPromotionItem(merged[0]);
    expect(candidate?.value).toMatchObject({ occurrences: 3 });

    let update = baseline();
    update = recordSelfUpdateVerification(update, {
      verificationId: "response:repeat:001", verifiedOutcome: true,
      score: 0.8, behavior, protectedCorrections: [rule], now,
    });
    update = recordSelfUpdateVerification(update, {
      verificationId: "response:repeat:001", verifiedOutcome: true,
      score: 0.9, behavior, protectedCorrections: [rule], now,
    });
    expect(update.verificationCount).toBe(1);
    expect(decideSelfUpdate(update).decision.disposition).toBe("continue_verifying");
  });

  it("can accept two genuinely distinct verified outcomes while preserving corrections", () => {
    let update = baseline();
    for (const [verificationId, score] of [
      ["response:distinct:001", 0.6],
      ["response:distinct:002", 0.8],
    ] as const) {
      update = recordSelfUpdateVerification(update, {
        verificationId, verifiedOutcome: true, score, behavior,
        protectedCorrections: [rule], now,
      });
    }
    expect(update.verificationCount).toBe(2);
    expect(decideSelfUpdate(update).decision.disposition).toBe("retain");
    expect(update.protectedCorrectionsAfter).toEqual([rule]);
  });

  it("reverts despite high scores when the protected correction disappears", () => {
    let update = baseline();
    for (const verificationId of ["response:separate:001", "response:separate:002"]) {
      update = recordSelfUpdateVerification(update, {
        verificationId, verifiedOutcome: true, score: 0.99,
        behavior, protectedCorrections: [], now,
      });
    }
    expect(update.verificationCount).toBe(2);
    expect(decideSelfUpdate(update).decision.disposition).toBe("revert");
  });
});
