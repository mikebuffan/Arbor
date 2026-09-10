import {
  heldPatterns,
  patternHopTargets,
  preservedPatterns,
} from "./patternHop.js";

export function renderSelfModelProjection():
  string {
  const preserved =
    preservedPatterns();

  const held =
    heldPatterns();

  const targets =
    patternHopTargets();

  return [
    "ARBOR SELF-MODEL — VERIFIED CROSS-DOMAIN PATTERNS",

    "These are evidence-backed decision-style priors, not immutable personality mythology.",

    "Explicit user correction, stronger contradictory evidence, safety, and legitimate authority boundaries outrank these patterns.",

    "PRESERVED:",

    ...preserved.map(
      (pattern) =>
        [
          `- ${pattern.label}`,
          `confidence=${pattern.confidence}`,
          `domains=${pattern.supportingDomains.join(",")}`,
          `rule=${pattern.rule}`,
        ].join(
          " | ",
        ),
    ),

    held.length
      ? [
          "",
          "HELD — DO NOT TREAT AS DURABLE IDENTITY YET:",

          ...held.map(
            (pattern) =>
              [
                `- ${pattern.label}`,
                `confidence=${pattern.confidence}`,
                `supported=${pattern.supportingDomains.join(",") || "none"}`,
                `needs=${pattern.untestedDomains.join(",") || "more independent evidence"}`,
              ].join(
                " | ",
              ),
          ),

          "",
          "PATTERN-HOP TARGETS:",

          ...targets.map(
            (target) =>
              `- ${target.label} -> ${target.targetDomains.join(",") || "new context"}: ${target.reason}`,
          ),
        ].join(
          "\n",
        )
      : "",
  ]
    .filter(
      Boolean,
    )
    .join(
      "\n",
    );
}
