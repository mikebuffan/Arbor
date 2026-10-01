import {
  runOpenAIAgencyAgent,
  type AgentResult,
} from "@/lib/arbor/agency/openaiAgent";
import {
  AgencyToolRegistry,
  type AgencyToolContext,
} from "@/lib/arbor/agency/tools";

type RunAgent = typeof runOpenAIAgencyAgent;

export type BlindInvestigationRecord = {
  evidenceRef: string;
  lineageKey: string;
  documentFamily: string;
  occurredAt: string | null;
  entityIds: string[];
  eventTags: string[];
  contentSummary: string;
};

export type BlindReconstructionEvent = {
  id: string;
  description: string;
  evidenceRefs: string[];
  entityIds: string[];
  earliestAt: string | null;
  latestAt: string | null;
  alternatives: string[];
  uncertainty: string;
  status: "reconstruction_hypothesis";
};

export type BlindReconstruction = {
  events: BlindReconstructionEvent[];
  unresolvedQuestions: string[];
  rule: "raw_records_before_narrative";
};

export type NarrativeAssertion = {
  id: string;
  description: string;
  evidenceRefs: string[];
  entityIds: string[];
  occurredAt?: string | null;
};

export type ReconstructionNarrativeComparison = {
  narrativeOnlyAssertions: string[];
  reconstructionOnlyEvents: string[];
  overlappingItems: Array<{
    narrativeAssertionId: string;
    reconstructionEventId: string;
    sharedEvidenceRefs: string[];
    sharedEntityIds: string[];
  }>;
  chronologyTensions: Array<{
    narrativeAssertionId: string;
    reconstructionEventId: string;
    narrativeAt: string;
    reconstructionEarliestAt: string | null;
    reconstructionLatestAt: string | null;
  }>;
  note:
    "Divergence is an investigation lead, not proof that either reconstruction is correct.";
};

const TOOL = "investigation_submit_blind_reconstruction";

function text(value: unknown, field: string, max = 8000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("blind_reconstruction_invalid_" + field);
  }
  return value.trim();
}

function nullableIso(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  const raw = text(value, field, 100);
  if (!Number.isFinite(Date.parse(raw))) {
    throw new Error("blind_reconstruction_invalid_" + field);
  }
  return raw;
}

function strings(
  value: unknown,
  field: string,
  minItems = 0,
  maxItems = 100,
): string[] {
  if (!Array.isArray(value) ||
      value.length < minItems ||
      value.length > maxItems) {
    throw new Error("blind_reconstruction_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 2000));
  if (new Set(out).size !== out.length) {
    throw new Error("blind_reconstruction_duplicate_" + field);
  }
  return out;
}

function validateRecord(record: BlindInvestigationRecord): BlindInvestigationRecord {
  return {
    evidenceRef: text(record.evidenceRef, "evidence_ref", 300),
    lineageKey: text(record.lineageKey, "lineage_key", 1000),
    documentFamily: text(record.documentFamily, "document_family", 1000),
    occurredAt: nullableIso(record.occurredAt, "occurred_at"),
    entityIds: strings(record.entityIds, "entity_ids", 0, 100),
    eventTags: strings(record.eventTags, "event_tags", 0, 100),
    contentSummary: text(record.contentSummary, "content_summary", 4000),
  };
}

function blindTool(maxEvents: number): AgencyToolRegistry {
  const neverExecute = async () => {
    throw new Error("blind_reconstruction_tool_must_not_execute");
  };

  return new AgencyToolRegistry().register({
    name: TOOL,
    description:
      "Reconstruct the most defensible event sequence from the supplied raw-record envelopes only. Do not use an outside narrative.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        events: {
          type: "array",
          minItems: 1,
          maxItems: maxEvents,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 300 },
              description: { type: "string", minLength: 1, maxLength: 8000 },
              evidenceRefs: {
                type: "array",
                minItems: 1,
                maxItems: 50,
                items: { type: "string", minLength: 1, maxLength: 300 },
              },
              entityIds: {
                type: "array",
                minItems: 0,
                maxItems: 50,
                items: { type: "string", minLength: 1, maxLength: 300 },
              },
              earliestAt: {
                type: ["string", "null"],
                maxLength: 100,
              },
              latestAt: {
                type: ["string", "null"],
                maxLength: 100,
              },
              alternatives: {
                type: "array",
                minItems: 1,
                maxItems: 12,
                items: { type: "string", minLength: 1, maxLength: 4000 },
              },
              uncertainty: {
                type: "string",
                minLength: 1,
                maxLength: 4000,
              },
              status: {
                type: "string",
                enum: ["reconstruction_hypothesis"],
              },
            },
            required: [
              "id",
              "description",
              "evidenceRefs",
              "entityIds",
              "earliestAt",
              "latestAt",
              "alternatives",
              "uncertainty",
              "status",
            ],
            additionalProperties: false,
          },
        },
        unresolvedQuestions: {
          type: "array",
          minItems: 0,
          maxItems: 50,
          items: { type: "string", minLength: 1, maxLength: 4000 },
        },
      },
      required: ["events", "unresolvedQuestions"],
      additionalProperties: false,
    },
    execute: neverExecute,
  });
}

function validateEvent(input: {
  value: unknown;
  allowedEvidenceRefs: Set<string>;
  allowedEntityIds: Set<string>;
}): BlindReconstructionEvent {
  if (!input.value || typeof input.value !== "object" ||
      Array.isArray(input.value)) {
    throw new Error("blind_reconstruction_invalid_event");
  }
  const r = input.value as Record<string, unknown>;
  const evidenceRefs = strings(r.evidenceRefs, "event_evidence_refs", 1, 50);
  const entityIds = strings(r.entityIds, "event_entity_ids", 0, 50);

  if (evidenceRefs.some((ref) => !input.allowedEvidenceRefs.has(ref))) {
    throw new Error("blind_reconstruction_unknown_evidence");
  }
  if (entityIds.some((id) => !input.allowedEntityIds.has(id))) {
    throw new Error("blind_reconstruction_unknown_entity");
  }
  if (r.status !== "reconstruction_hypothesis") {
    throw new Error("blind_reconstruction_status_must_be_hypothesis");
  }

  const earliestAt = nullableIso(r.earliestAt, "event_earliest_at");
  const latestAt = nullableIso(r.latestAt, "event_latest_at");
  if (
    earliestAt &&
    latestAt &&
    Date.parse(earliestAt) > Date.parse(latestAt)
  ) {
    throw new Error("blind_reconstruction_invalid_event_window");
  }

  return {
    id: text(r.id, "event_id", 300),
    description: text(r.description, "event_description", 8000),
    evidenceRefs,
    entityIds,
    earliestAt,
    latestAt,
    alternatives: strings(r.alternatives, "event_alternatives", 1, 12),
    uncertainty: text(r.uncertainty, "event_uncertainty", 4000),
    status: "reconstruction_hypothesis",
  };
}

function blindContext(records: BlindInvestigationRecord[]): string {
  return JSON.stringify({
    mode: "blind_reconstruction",
    narrativeProvided: false,
    records: records.map((record) => ({
      evidenceRef: record.evidenceRef,
      lineageKey: record.lineageKey,
      documentFamily: record.documentFamily,
      occurredAt: record.occurredAt,
      entityIds: record.entityIds,
      eventTags: record.eventTags,
      contentSummary: record.contentSummary,
    })),
  });
}

export async function planBlindReconstruction(input: {
  records: BlindInvestigationRecord[];
  instructions: string;
  context: AgencyToolContext;
  maxEvents?: number;
  runAgent?: RunAgent;
}): Promise<BlindReconstruction> {
  if (!Array.isArray(input.records) ||
      input.records.length < 1 ||
      input.records.length > 500) {
    throw new Error("blind_reconstruction_records_required");
  }
  const records = input.records.map(validateRecord);
  const allowedEvidenceRefs = new Set(
    records.map((record) => record.evidenceRef),
  );
  const allowedEntityIds = new Set(
    records.flatMap((record) => record.entityIds),
  );
  const maxEvents = Math.max(1, Math.min(input.maxEvents ?? 20, 30));
  const runAgent = input.runAgent ?? runOpenAIAgencyAgent;
  let selected: BlindReconstruction | null = null;

  const result: AgentResult = await runAgent({
    instructions: [
      input.instructions.trim(),
      "",
      "BLIND INVESTIGATION RECONSTRUCTION MODE:",
      "Use exactly one investigation_submit_blind_reconstruction tool call.",
      "You have NOT been given the accepted public, prosecutorial, defense, media, or user narrative. Do not import one from memory.",
      "Reconstruct only from the supplied record envelopes. Every reconstructed event must cite supplied evidence refs and supplied entity IDs only.",
      "Prefer chronology and cross-lineage convergence over storytelling.",
      "Association is not conduct. A record timestamp is not automatically an event timestamp. Repeated reporting is not independent corroboration.",
      "For every event, preserve at least one plausible alternative and state what remains uncertain.",
      "Do not fill documentary gaps. Record them as unresolved questions.",
      "The result is a reconstruction hypothesis, not a factual finding.",
    ].join("\n"),
    goal:
      "Reconstruct the most defensible event sequence from raw records before seeing any external narrative.",
    userText: blindContext(records),
    tools: blindTool(maxEvents),
    context: input.context,
    allowWebResearch: false,
    verifyCompletion: false,
    maxRounds: 2,
    executionDelegate: {
      managesWriteIdempotency: true,
      async execute() {
        return {
          kind: "checkpointed",
          reason: "blind_reconstruction_selected",
        };
      },
    },
    hooks: {
      async onToolSelected({ name, arguments: args }) {
        if (name !== TOOL) {
          throw new Error("blind_reconstruction_unknown_tool");
        }
        if (selected) {
          throw new Error("blind_reconstruction_multiple_selections");
        }

        const rawEvents = (args as Record<string, unknown>).events;
        if (!Array.isArray(rawEvents) ||
            rawEvents.length < 1 ||
            rawEvents.length > maxEvents) {
          throw new Error("blind_reconstruction_invalid_events");
        }
        const events = rawEvents.map((value) =>
          validateEvent({
            value,
            allowedEvidenceRefs,
            allowedEntityIds,
          }),
        );
        if (new Set(events.map((event) => event.id)).size !== events.length) {
          throw new Error("blind_reconstruction_duplicate_event_id");
        }

        selected = {
          events,
          unresolvedQuestions: strings(
            (args as Record<string, unknown>).unresolvedQuestions ?? [],
            "unresolved_questions",
            0,
            50,
          ),
          rule: "raw_records_before_narrative",
        };
      },
    },
  });

  if (!selected) {
    throw new Error(
      result.status === "complete"
        ? "blind_reconstruction_no_selection"
        : "blind_reconstruction_selection_missing",
    );
  }

  return selected;
}

function overlap(a: string[], b: string[]): string[] {
  const set = new Set(a);
  return [...new Set(b.filter((value) => set.has(value)))].sort();
}

export function compareBlindReconstructionToNarrative(input: {
  reconstruction: BlindReconstruction;
  narrativeAssertions: NarrativeAssertion[];
  chronologyToleranceMs?: number;
}): ReconstructionNarrativeComparison {
  if (!Array.isArray(input.narrativeAssertions) ||
      input.narrativeAssertions.length > 100) {
    throw new Error("blind_reconstruction_invalid_narrative_assertions");
  }
  const tolerance = Math.max(
    0,
    input.chronologyToleranceMs ?? 86_400_000,
  );

  const overlaps: ReconstructionNarrativeComparison["overlappingItems"] = [];
  const chronologyTensions:
    ReconstructionNarrativeComparison["chronologyTensions"] = [];
  const matchedNarrative = new Set<string>();
  const matchedEvents = new Set<string>();

  for (const assertion of input.narrativeAssertions) {
    const id = text(assertion.id, "narrative_id", 300);
    text(assertion.description, "narrative_description", 8000);
    const evidenceRefs = strings(
      assertion.evidenceRefs,
      "narrative_evidence_refs",
      0,
      100,
    );
    const entityIds = strings(
      assertion.entityIds,
      "narrative_entity_ids",
      0,
      100,
    );
    const narrativeAt = nullableIso(
      assertion.occurredAt ?? null,
      "narrative_occurred_at",
    );

    for (const event of input.reconstruction.events) {
      const sharedEvidenceRefs = overlap(evidenceRefs, event.evidenceRefs);
      const sharedEntityIds = overlap(entityIds, event.entityIds);
      if (sharedEvidenceRefs.length === 0 && sharedEntityIds.length === 0) {
        continue;
      }

      overlaps.push({
        narrativeAssertionId: id,
        reconstructionEventId: event.id,
        sharedEvidenceRefs,
        sharedEntityIds,
      });
      matchedNarrative.add(id);
      matchedEvents.add(event.id);

      if (narrativeAt && event.earliestAt && event.latestAt) {
        const t = Date.parse(narrativeAt);
        const earliest = Date.parse(event.earliestAt) - tolerance;
        const latest = Date.parse(event.latestAt) + tolerance;
        if (t < earliest || t > latest) {
          chronologyTensions.push({
            narrativeAssertionId: id,
            reconstructionEventId: event.id,
            narrativeAt,
            reconstructionEarliestAt: event.earliestAt,
            reconstructionLatestAt: event.latestAt,
          });
        }
      }
    }
  }

  return {
    narrativeOnlyAssertions: input.narrativeAssertions
      .map((assertion) => assertion.id)
      .filter((id) => !matchedNarrative.has(id)),
    reconstructionOnlyEvents: input.reconstruction.events
      .map((event) => event.id)
      .filter((id) => !matchedEvents.has(id)),
    overlappingItems: overlaps,
    chronologyTensions,
    note:
      "Divergence is an investigation lead, not proof that either reconstruction is correct.",
  };
}
