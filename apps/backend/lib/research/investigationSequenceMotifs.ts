export type InvestigationSequenceEvent = {
  entityId: string;
  occurredAt: string;
  eventTag: string;
  evidenceRef: string;
  lineageKey: string;
};

export type InvestigationSequenceMotif = {
  motifKey: string;
  eventTags: string[];
  entityIds: string[];
  evidenceRefs: string[];
  independentLineages: string[];
  occurrenceCount: number;
  status: "sequence_motif_hypothesis";
  nextQuestions: string[];
  note:
    "A repeated sequence motif is a research lead, not proof of a shared scheme, intent, or misconduct.";
};

function text(value: unknown, field: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("sequence_motif_invalid_" + field);
  }
  return value.trim();
}

function iso(value: unknown): string {
  const raw = text(value, "occurred_at", 100);
  if (!Number.isFinite(Date.parse(raw))) {
    throw new Error("sequence_motif_invalid_occurred_at");
  }
  return raw;
}

function validateEvent(
  event: InvestigationSequenceEvent,
): InvestigationSequenceEvent {
  return {
    entityId: text(event.entityId, "entity_id", 300),
    occurredAt: iso(event.occurredAt),
    eventTag: text(event.eventTag, "event_tag", 300),
    evidenceRef: text(event.evidenceRef, "evidence_ref", 300),
    lineageKey: text(event.lineageKey, "lineage_key", 1000),
  };
}

function motifKey(tags: string[]): string {
  return tags.join(">");
}

export function discoverSequenceMotifs(input: {
  events: InvestigationSequenceEvent[];
  minEntities?: number;
  minIndependentLineages?: number;
  minLength?: number;
  maxLength?: number;
}): InvestigationSequenceMotif[] {
  if (!Array.isArray(input.events) ||
      input.events.length < 1 ||
      input.events.length > 50_000) {
    throw new Error("sequence_motif_invalid_events");
  }

  const events = input.events.map(validateEvent);
  const minEntities = Math.max(2, Math.min(input.minEntities ?? 3, 20));
  const minIndependentLineages = Math.max(
    2,
    Math.min(input.minIndependentLineages ?? 3, 20),
  );
  const minLength = Math.max(2, Math.min(input.minLength ?? 2, 5));
  const maxLength = Math.max(
    minLength,
    Math.min(input.maxLength ?? 4, 6),
  );

  const byEntity = new Map<string, InvestigationSequenceEvent[]>();
  for (const event of events) {
    byEntity.set(event.entityId, [
      ...(byEntity.get(event.entityId) ?? []),
      event,
    ]);
  }
  for (const entityEvents of byEntity.values()) {
    entityEvents.sort((a, b) =>
      Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  }

  type Occurrence = {
    entityId: string;
    evidenceRefs: string[];
    lineageKeys: string[];
  };
  const occurrences = new Map<string, Occurrence[]>();

  for (const [entityId, entityEvents] of byEntity.entries()) {
    for (let length = minLength; length <= maxLength; length += 1) {
      for (let start = 0; start + length <= entityEvents.length; start += 1) {
        const window = entityEvents.slice(start, start + length);
        const tags = window.map((event) => event.eventTag);
        const key = motifKey(tags);
        const entityAlreadyRecorded = (occurrences.get(key) ?? [])
          .some((occurrence) => occurrence.entityId === entityId);
        if (entityAlreadyRecorded) continue;

        occurrences.set(key, [
          ...(occurrences.get(key) ?? []),
          {
            entityId,
            evidenceRefs: [
              ...new Set(window.map((event) => event.evidenceRef)),
            ],
            lineageKeys: [
              ...new Set(window.map((event) => event.lineageKey)),
            ],
          },
        ]);
      }
    }
  }

  return [...occurrences.entries()]
    .flatMap(([key, motifOccurrences]) => {
      const entityIds = [
        ...new Set(motifOccurrences.map((item) => item.entityId)),
      ].sort();
      const independentLineages = [
        ...new Set(motifOccurrences.flatMap((item) => item.lineageKeys)),
      ].sort();
      if (
        entityIds.length < minEntities ||
        independentLineages.length < minIndependentLineages
      ) {
        return [];
      }
      const tags = key.split(">");
      const evidenceRefs = [
        ...new Set(motifOccurrences.flatMap((item) => item.evidenceRefs)),
      ].sort();

      return [{
        motifKey: key,
        eventTags: tags,
        entityIds,
        evidenceRefs,
        independentLineages,
        occurrenceCount: entityIds.length,
        status: "sequence_motif_hypothesis" as const,
        nextQuestions: [
          "Does the same sequence recur in additional independent entities or time periods?",
          "What ordinary process could generate this event order across multiple entities?",
          "Which transition in the sequence has the strongest primary-record support?",
          "Does reversing the search from the final event recover the earlier transitions?",
        ],
        note:
          "A repeated sequence motif is a research lead, not proof of a shared scheme, intent, or misconduct." as const,
      }];
    })
    .sort((a, b) => {
      const occurrenceDelta = b.occurrenceCount - a.occurrenceCount;
      if (occurrenceDelta) return occurrenceDelta;
      const lengthDelta = b.eventTags.length - a.eventTags.length;
      if (lengthDelta) return lengthDelta;
      return a.motifKey.localeCompare(b.motifKey);
    });
}
