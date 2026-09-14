export type EvidenceClass =
  | "established"
  | "observed"
  | "implemented"
  | "designed"
  | "proposed"
  | "unknown"
  | "not_recovered";

export type CognitionEvidenceEvent = {
  subject: string;
  attribute: string;
  evidenceClass: EvidenceClass;
  sourceId: string;
  originId: string;
  occurredAt: string;
  supports: boolean;
  passingTest?: boolean;
  independentlyObserved?: boolean;
};

export type IndependentSupport = {
  supportingEvents: CognitionEvidenceEvent[];
  independentOrigins: string[];
  qualifies: boolean;
  qualification:
    | "repeated_independent_evidence"
    | "tested_and_independently_observed"
    | "insufficient";
};

const REQUIRED_SUPPORTING_EVENTS = 3;
const REQUIRED_INDEPENDENT_ORIGINS = 2;

function requireIdentity(event: CognitionEvidenceEvent): void {
  if (!event.sourceId.trim() || !event.originId.trim()) {
    throw new Error("cognition_evidence_requires_source_and_origin");
  }
}

function originFingerprint(event: CognitionEvidenceEvent): string {
  return [
    event.originId,
    event.subject,
    event.attribute,
    event.evidenceClass,
    event.supports ? "support" : "oppose",
  ].join("|");
}

export function dedupeEvidenceByOrigin(
  events: CognitionEvidenceEvent[],
): CognitionEvidenceEvent[] {
  const seen = new Set<string>();
  const unique: CognitionEvidenceEvent[] = [];

  for (const event of events) {
    requireIdentity(event);
    const fingerprint = originFingerprint(event);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    unique.push(event);
  }

  return unique;
}

export function evaluateIndependentSupport(
  events: CognitionEvidenceEvent[],
): IndependentSupport {
  const unique = dedupeEvidenceByOrigin(events);
  const supportingEvents = unique.filter((event) => event.supports);
  const independentOrigins = [
    ...new Set(supportingEvents.map((event) => event.originId)),
  ];

  const testedAndObserved = supportingEvents.some(
    (event) => event.passingTest,
  ) && supportingEvents.some(
    (event) => event.independentlyObserved,
  );

  if (testedAndObserved && independentOrigins.length >= 2) {
    return {
      supportingEvents,
      independentOrigins,
      qualifies: true,
      qualification: "tested_and_independently_observed",
    };
  }

  if (
    supportingEvents.length >= REQUIRED_SUPPORTING_EVENTS &&
    independentOrigins.length >= REQUIRED_INDEPENDENT_ORIGINS
  ) {
    return {
      supportingEvents,
      independentOrigins,
      qualifies: true,
      qualification: "repeated_independent_evidence",
    };
  }

  return {
    supportingEvents,
    independentOrigins,
    qualifies: false,
    qualification: "insufficient",
  };
}
