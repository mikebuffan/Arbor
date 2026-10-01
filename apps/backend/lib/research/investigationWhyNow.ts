export type InvestigationWhyNowEvent = {
  id: string;
  entityIds: string[];
  eventTag: string;
  occurredAt: string;
  evidenceRef: string;
  lineageKey: string;
};

export type InvestigationWhyNowResult = {
  focalEventId: string;
  before: InvestigationWhyNowEvent[];
  after: InvestigationWhyNowEvent[];
  independentLineages: string[];
  questions: string[];
  note:
    "Temporal proximity can suggest what to investigate next; it does not establish causation.";
};

function text(value: unknown, field: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("why_now_invalid_" + field);
  }
  return value.trim();
}

function validate(event: InvestigationWhyNowEvent): InvestigationWhyNowEvent {
  if (!Number.isFinite(Date.parse(event.occurredAt))) {
    throw new Error("why_now_invalid_occurred_at");
  }
  if (!Array.isArray(event.entityIds) ||
      event.entityIds.length < 1 ||
      event.entityIds.length > 50) {
    throw new Error("why_now_invalid_entity_ids");
  }
  return {
    id: text(event.id, "event_id", 300),
    entityIds: [...new Set(
      event.entityIds.map((id) => text(id, "entity_id", 300)),
    )],
    eventTag: text(event.eventTag, "event_tag", 500),
    occurredAt: event.occurredAt,
    evidenceRef: text(event.evidenceRef, "evidence_ref", 1000),
    lineageKey: text(event.lineageKey, "lineage_key", 1000),
  };
}

export function analyzeWhyNow(input: {
  focalEventId: string;
  events: InvestigationWhyNowEvent[];
  backwardWindowMs?: number;
  forwardWindowMs?: number;
}): InvestigationWhyNowResult {
  if (!Array.isArray(input.events) ||
      input.events.length < 1 ||
      input.events.length > 50_000) {
    throw new Error("why_now_invalid_events");
  }
  const events = input.events.map(validate);
  const focalEventId = text(input.focalEventId, "focal_event_id", 300);
  const focal = events.find((event) => event.id === focalEventId);
  if (!focal) throw new Error("why_now_focal_event_not_found");

  const backward = Math.max(
    0,
    Math.min(
      input.backwardWindowMs ?? 30 * 24 * 60 * 60 * 1000,
      365 * 24 * 60 * 60 * 1000,
    ),
  );
  const forward = Math.max(
    0,
    Math.min(
      input.forwardWindowMs ?? 30 * 24 * 60 * 60 * 1000,
      365 * 24 * 60 * 60 * 1000,
    ),
  );
  const t = Date.parse(focal.occurredAt);

  const before = events
    .filter((event) => {
      if (event.id === focal.id) return false;
      const delta = t - Date.parse(event.occurredAt);
      return delta >= 0 && delta <= backward;
    })
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  const after = events
    .filter((event) => {
      if (event.id === focal.id) return false;
      const delta = Date.parse(event.occurredAt) - t;
      return delta >= 0 && delta <= forward;
    })
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));

  return {
    focalEventId,
    before,
    after,
    independentLineages: [
      ...new Set([
        focal.lineageKey,
        ...before.map((event) => event.lineageKey),
        ...after.map((event) => event.lineageKey),
      ]),
    ].sort(),
    questions: [
      "What changed immediately before the focal event?",
      "Which nearby event is independently sourced rather than copied from the focal event's lineage?",
      "What ordinary process could explain the timing without causal connection?",
      "Did the focal event predictably produce any of the events immediately after it?",
    ],
    note:
      "Temporal proximity can suggest what to investigate next; it does not establish causation.",
  };
}
