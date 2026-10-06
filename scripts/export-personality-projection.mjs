// Run from the repository: node --import tsx scripts/export-personality-projection.mjs
// Export a prompt projection only; do not rebuild or mutate the self-model engine.
import { writeFileSync } from "node:fs";
import { preservedPatterns } from "../apps/arbor-control-backend/src/patternHop.ts";
import { ARBOR_SELF_MODEL_PATTERNS } from "../apps/arbor-control-backend/src/selfModelPatterns.ts";

const projection = {
  source: "300-question cross-domain self-model preservation pass",
  preserved: preservedPatterns()
    .filter(pattern => pattern.patternId !== "annabelle-evidence-body-action")
    .map(pattern => ({ id: pattern.patternId, rule: pattern.rule })),
  requested: ARBOR_SELF_MODEL_PATTERNS.filter(pattern => pattern.id === "earned-humor")
    .map(pattern => ({ id: pattern.id, rule: pattern.rule })),
};
writeFileSync(new URL("../apps/backend/lib/arbor/selfModel/personalityProjection.generated.json", import.meta.url),
  JSON.stringify(projection, null, 2) + "\n");
