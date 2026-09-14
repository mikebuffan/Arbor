import type { CognitionEvidenceEvent, EvidenceClass } from "./evidence";

export type TemporalStateResolution = {
  subject: string;
  attribute: string;
  current: CognitionEvidenceEvent | null;
  history: CognitionEvidenceEvent[];
};

const ACTUAL_CLASSES = new Set<EvidenceClass>([
  "established",
  "observed",
  "implemented",
]);

function time(event: CognitionEvidenceEvent): number {
  const parsed = Date.parse(event.occurredAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Preserve the complete trajectory while answering from the latest supported
 * actual state. A newer design/proposal cannot demote an already supported
 * observed/implemented/established capability.
 */
export function resolveTemporalState(
  events: CognitionEvidenceEvent[],
  subject: string,
  attribute: string,
): TemporalStateResolution {
  const history = events
    .filter(
      (event) =>
        event.subject === subject &&
        event.attribute === attribute,
    )
    .sort((a, b) => time(a) - time(b));

  const supportedActual = history.filter(
    (event) => event.supports && ACTUAL_CLASSES.has(event.evidenceClass),
  );

  return {
    subject,
    attribute,
    current: supportedActual.at(-1) ?? null,
    history,
  };
}
