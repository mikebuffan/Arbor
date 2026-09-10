export type TelemetryPrivacyFinding = {
  path: string;
  reason: "forbidden_field" | "unexpected_field" | "forbidden_value";
};

const ROOT_FIELDS = new Set([
  "id",
  "user_id",
  "project_id",
  "thread_id",
  "episode_id",
  "logic_gates_hit",
  "proof_snapshot",
  "retrieval_latency_ms",
  "prompt_tokens",
  "completion_tokens",
  "created_at",
]);

const PROOF_FIELDS = new Set([
  "injected_anchor_ids",
  "injected_memory_item_ids",
  "safety_tier",
  "logic_gates_hit",
]);

const FORBIDDEN_FIELD =
  /^(?:authorization|bearer|token|secret|signed_?url|prompt|raw_?prompt|messages?|content|raw_?content|assistant_?text|user_?text|provider_?error|raw_?error|stack)$/i;

function walkForbiddenValues(
  value: unknown,
  path: string,
  forbiddenValues: string[],
  findings: TelemetryPrivacyFinding[],
) {
  if (typeof value === "string") {
    if (
      forbiddenValues.some(
        (forbidden) => forbidden.length >= 8 && value.includes(forbidden),
      )
    ) {
      findings.push({ path, reason: "forbidden_value" });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      walkForbiddenValues(
        child,
        path + "[" + index + "]",
        forbiddenValues,
        findings,
      ),
    );
    return;
  }

  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    walkForbiddenValues(
      child,
      path ? path + "." + key : key,
      forbiddenValues,
      findings,
    );
  }
}

export function auditTelemetryPrivacy(
  row: Record<string, unknown>,
  forbiddenValues: string[] = [],
): TelemetryPrivacyFinding[] {
  const findings: TelemetryPrivacyFinding[] = [];

  for (const [key, value] of Object.entries(row)) {
    if (FORBIDDEN_FIELD.test(key)) {
      findings.push({ path: key, reason: "forbidden_field" });
      continue;
    }
    if (!ROOT_FIELDS.has(key)) {
      findings.push({ path: key, reason: "unexpected_field" });
      continue;
    }

    if (key === "proof_snapshot" && value && typeof value === "object") {
      for (const proofKey of Object.keys(value)) {
        if (FORBIDDEN_FIELD.test(proofKey)) {
          findings.push({
            path: "proof_snapshot." + proofKey,
            reason: "forbidden_field",
          });
        } else if (!PROOF_FIELDS.has(proofKey)) {
          findings.push({
            path: "proof_snapshot." + proofKey,
            reason: "unexpected_field",
          });
        }
      }
    }
  }

  walkForbiddenValues(row, "", forbiddenValues, findings);
  return findings;
}
