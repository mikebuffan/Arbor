import {
  runOpenAIAgencyAgent,
  type AgentResult,
} from "@/lib/arbor/agency/openaiAgent";
import {
  AgencyToolRegistry,
  type AgencyToolContext,
} from "@/lib/arbor/agency/tools";

type RunAgent = typeof runOpenAIAgencyAgent;

export type InvestigationAnomalyEnvelope = {
  anomalyId: string;
  hypothesis: string;
  evidenceRefs: string[];
  entityIds: string[];
  observedFeatures: string[];
};

export type InvestigationMundaneExplanation = {
  id: string;
  anomalyId: string;
  explanation: string;
  basisEvidenceRefs: string[];
  entityIds: string[];
  predictedFootprints: string[];
  falsifiers: string[];
  status: "ordinary_explanation_hypothesis";
};

export type InvestigationMundaneAdversaryResult = {
  explanations: InvestigationMundaneExplanation[];
  rule: "strongest_ordinary_explanation_first";
};

const TOOL = "investigation_submit_mundane_explanations";

function text(value: unknown, field: string, max = 8000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("mundane_adversary_invalid_" + field);
  }
  return value.trim();
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
    throw new Error("mundane_adversary_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 2000));
  if (new Set(out).size !== out.length) {
    throw new Error("mundane_adversary_duplicate_" + field);
  }
  return out;
}

function validateEnvelope(
  value: InvestigationAnomalyEnvelope,
): InvestigationAnomalyEnvelope {
  return {
    anomalyId: text(value.anomalyId, "anomaly_id", 300),
    hypothesis: text(value.hypothesis, "hypothesis", 8000),
    evidenceRefs: strings(value.evidenceRefs, "evidence_refs", 1, 100),
    entityIds: strings(value.entityIds, "entity_ids", 0, 50),
    observedFeatures: strings(
      value.observedFeatures,
      "observed_features",
      1,
      50,
    ),
  };
}

function plannerTool(maxExplanations: number): AgencyToolRegistry {
  const neverExecute = async () => {
    throw new Error("mundane_adversary_tool_must_not_execute");
  };
  return new AgencyToolRegistry().register({
    name: TOOL,
    description:
      "Generate strong ordinary/non-sensational explanations for a grounded anomaly and specify how each explanation could be tested.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        explanations: {
          type: "array",
          minItems: 1,
          maxItems: maxExplanations,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 300 },
              anomalyId: { type: "string", minLength: 1, maxLength: 300 },
              explanation: { type: "string", minLength: 1, maxLength: 8000 },
              basisEvidenceRefs: {
                type: "array",
                minItems: 1,
                maxItems: 100,
                items: { type: "string", minLength: 1, maxLength: 1000 },
              },
              entityIds: {
                type: "array",
                minItems: 0,
                maxItems: 50,
                items: { type: "string", minLength: 1, maxLength: 300 },
              },
              predictedFootprints: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                items: { type: "string", minLength: 1, maxLength: 2000 },
              },
              falsifiers: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                items: { type: "string", minLength: 1, maxLength: 2000 },
              },
              status: {
                type: "string",
                enum: ["ordinary_explanation_hypothesis"],
              },
            },
            required: [
              "id",
              "anomalyId",
              "explanation",
              "basisEvidenceRefs",
              "entityIds",
              "predictedFootprints",
              "falsifiers",
              "status",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["explanations"],
      additionalProperties: false,
    },
    execute: neverExecute,
  });
}

export async function planMundaneAdversaries(input: {
  anomaly: InvestigationAnomalyEnvelope;
  instructions: string;
  context: AgencyToolContext;
  maxExplanations?: number;
  runAgent?: RunAgent;
}): Promise<InvestigationMundaneAdversaryResult> {
  const anomaly = validateEnvelope(input.anomaly);
  const allowedEvidenceRefs = new Set(anomaly.evidenceRefs);
  const allowedEntityIds = new Set(anomaly.entityIds);
  const maxExplanations = Math.max(
    1,
    Math.min(input.maxExplanations ?? 5, 8),
  );
  const runAgent = input.runAgent ?? runOpenAIAgencyAgent;
  let selected: InvestigationMundaneExplanation[] | null = null;

  const result: AgentResult = await runAgent({
    instructions: [
      input.instructions.trim(),
      "",
      "ORDINARY-EXPLANATION ADVERSARY MODE:",
      "Use exactly one investigation_submit_mundane_explanations tool call.",
      "Generate the strongest boring, administrative, clerical, logistical, legal, routine, or coincidental explanations that fit the supplied anomaly.",
      "Do not weaken an ordinary explanation just to preserve the exciting hypothesis.",
      "Do not invent people, entities, evidence or events.",
      "Every explanation must predict concrete records or observable features and must name evidence that would falsify it.",
      "An ordinary explanation surviving is not proof it is correct. The purpose is to force the anomaly to beat a serious mundane alternative before receiving more research priority.",
    ].join("\n"),
    goal:
      "Stress-test the anomaly against the strongest ordinary explanations before escalating it.",
    userText: JSON.stringify({
      mode: "mundane_adversary",
      anomaly,
    }),
    tools: plannerTool(maxExplanations),
    context: input.context,
    allowWebResearch: false,
    verifyCompletion: false,
    maxRounds: 2,
    executionDelegate: {
      managesWriteIdempotency: true,
      async execute() {
        return {
          kind: "checkpointed",
          reason: "mundane_adversary_selected",
        };
      },
    },
    hooks: {
      async onToolSelected({ name, arguments: args }) {
        if (name !== TOOL) {
          throw new Error("mundane_adversary_unknown_tool");
        }
        if (selected) {
          throw new Error("mundane_adversary_multiple_selections");
        }
        const raw = (args as Record<string, unknown>).explanations;
        if (!Array.isArray(raw) ||
            raw.length < 1 ||
            raw.length > maxExplanations) {
          throw new Error("mundane_adversary_invalid_explanations");
        }
        selected = raw.map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw new Error("mundane_adversary_invalid_explanation");
          }
          const r = item as Record<string, unknown>;
          const anomalyId = text(r.anomalyId, "anomaly_id", 300);
          if (anomalyId !== anomaly.anomalyId) {
            throw new Error("mundane_adversary_anomaly_mismatch");
          }
          const basisEvidenceRefs = strings(
            r.basisEvidenceRefs,
            "basis_evidence_refs",
            1,
            100,
          );
          const entityIds = strings(r.entityIds, "entity_ids", 0, 50);
          if (basisEvidenceRefs.some((ref) => !allowedEvidenceRefs.has(ref))) {
            throw new Error("mundane_adversary_unknown_evidence");
          }
          if (entityIds.some((id) => !allowedEntityIds.has(id))) {
            throw new Error("mundane_adversary_unknown_entity");
          }
          if (r.status !== "ordinary_explanation_hypothesis") {
            throw new Error("mundane_adversary_invalid_status");
          }
          return {
            id: text(r.id, "id", 300),
            anomalyId,
            explanation: text(r.explanation, "explanation", 8000),
            basisEvidenceRefs,
            entityIds,
            predictedFootprints: strings(
              r.predictedFootprints,
              "predicted_footprints",
              1,
              20,
            ),
            falsifiers: strings(r.falsifiers, "falsifiers", 1, 20),
            status: "ordinary_explanation_hypothesis" as const,
          };
        });
      },
    },
  });

  if (!selected) {
    throw new Error(
      result.status === "complete"
        ? "mundane_adversary_no_selection"
        : "mundane_adversary_selection_missing",
    );
  }

  return {
    explanations: selected,
    rule: "strongest_ordinary_explanation_first",
  };
}
