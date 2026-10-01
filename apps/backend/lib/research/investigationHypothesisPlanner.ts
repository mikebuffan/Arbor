import {
  runOpenAIAgencyAgent,
  type AgentResult,
} from "@/lib/arbor/agency/openaiAgent";
import {
  AgencyToolRegistry,
  type AgencyToolContext,
} from "@/lib/arbor/agency/tools";
import type {
  InvestigationDiscoveryLead,
} from "./investigationDiscovery";

type RunAgent = typeof runOpenAIAgencyAgent;

export type InvestigationHypothesisProposal = {
  id: string;
  hypothesis: string;
  whyInteresting: string;
  basisLeadIds: string[];
  basisEvidenceRefs: string[];
  referencedEntityIds: string[];
  predictedFootprints: string[];
  disconfirmingEvidence: string[];
  searchSeeds: string[];
  confidence: number;
  status: "hypothesis";
};

export type InvestigationHypothesisPlan = {
  proposals: InvestigationHypothesisProposal[];
  plannerRule: "creative_but_evidence_bounded";
};

const TOOL = "investigation_propose_hypotheses";

function text(value: unknown, field: string, max = 8000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_hypothesis_invalid_" + field);
  }
  return value.trim();
}

function strings(
  value: unknown,
  field: string,
  maxItems = 50,
): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
    throw new Error("investigation_hypothesis_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 2000));
  if (new Set(out).size !== out.length) {
    throw new Error("investigation_hypothesis_duplicate_" + field);
  }
  return out;
}

function number(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("investigation_hypothesis_invalid_" + field);
  }
  return value;
}

function validateProposal(input: {
  value: unknown;
  allowedLeadIds: Set<string>;
  allowedEvidenceRefs: Set<string>;
  allowedEntityIds: Set<string>;
}): InvestigationHypothesisProposal {
  if (!input.value || typeof input.value !== "object" ||
      Array.isArray(input.value)) {
    throw new Error("investigation_hypothesis_invalid_proposal");
  }
  const r = input.value as Record<string, unknown>;
  const basisLeadIds = strings(r.basisLeadIds, "basis_lead_ids", 12);
  const basisEvidenceRefs = strings(
    r.basisEvidenceRefs,
    "basis_evidence_refs",
    50,
  );
  const referencedEntityIds = strings(
    r.referencedEntityIds,
    "referenced_entity_ids",
    30,
  );
  if (basisLeadIds.some((id) => !input.allowedLeadIds.has(id))) {
    throw new Error("investigation_hypothesis_unknown_lead");
  }
  if (basisEvidenceRefs.some((ref) => !input.allowedEvidenceRefs.has(ref))) {
    throw new Error("investigation_hypothesis_unknown_evidence");
  }
  if (referencedEntityIds.some((id) => !input.allowedEntityIds.has(id))) {
    throw new Error("investigation_hypothesis_unknown_entity");
  }

  const confidence = number(r.confidence, "confidence");
  if (confidence < 0 || confidence > 0.49) {
    throw new Error("investigation_hypothesis_confidence_must_remain_hypothetical");
  }
  if (r.status !== "hypothesis") {
    throw new Error("investigation_hypothesis_status_must_be_hypothesis");
  }

  return {
    id: text(r.id, "id", 300),
    hypothesis: text(r.hypothesis, "hypothesis", 8000),
    whyInteresting: text(r.whyInteresting, "why_interesting", 4000),
    basisLeadIds,
    basisEvidenceRefs,
    referencedEntityIds,
    predictedFootprints: strings(
      r.predictedFootprints,
      "predicted_footprints",
      20,
    ),
    disconfirmingEvidence: strings(
      r.disconfirmingEvidence,
      "disconfirming_evidence",
      20,
    ),
    searchSeeds: strings(r.searchSeeds, "search_seeds", 12),
    confidence,
    status: "hypothesis",
  };
}

function plannerTool(maxHypotheses: number): AgencyToolRegistry {
  const neverExecute = async () => {
    throw new Error("investigation_hypothesis_planning_tool_must_not_execute");
  };
  return new AgencyToolRegistry().register({
    name: TOOL,
    description:
      "Propose novel, evidence-bounded investigation hypotheses from the supplied anomaly leads. Hypotheses are search generators, never findings.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        proposals: {
          type: "array",
          minItems: 1,
          maxItems: maxHypotheses,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 300 },
              hypothesis: { type: "string", minLength: 1, maxLength: 8000 },
              whyInteresting: {
                type: "string",
                minLength: 1,
                maxLength: 4000,
              },
              basisLeadIds: {
                type: "array",
                minItems: 1,
                maxItems: 12,
                items: { type: "string", minLength: 1, maxLength: 300 },
              },
              basisEvidenceRefs: {
                type: "array",
                minItems: 1,
                maxItems: 50,
                items: { type: "string", minLength: 1, maxLength: 300 },
              },
              referencedEntityIds: {
                type: "array",
                minItems: 1,
                maxItems: 30,
                items: { type: "string", minLength: 1, maxLength: 300 },
              },
              predictedFootprints: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                items: { type: "string", minLength: 1, maxLength: 2000 },
              },
              disconfirmingEvidence: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                items: { type: "string", minLength: 1, maxLength: 2000 },
              },
              searchSeeds: {
                type: "array",
                minItems: 1,
                maxItems: 12,
                items: { type: "string", minLength: 1, maxLength: 2000 },
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 0.49,
              },
              status: {
                type: "string",
                enum: ["hypothesis"],
              },
            },
            required: [
              "id",
              "hypothesis",
              "whyInteresting",
              "basisLeadIds",
              "basisEvidenceRefs",
              "referencedEntityIds",
              "predictedFootprints",
              "disconfirmingEvidence",
              "searchSeeds",
              "confidence",
              "status",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["proposals"],
      additionalProperties: false,
    },
    execute: neverExecute,
  });
}

function leadContext(leads: InvestigationDiscoveryLead[]): string {
  return JSON.stringify({
    mode: "investigation_hypothesis_generation",
    rules: {
      associationIsNotConduct: true,
      hypothesisIsNotFinding: true,
      noNewEntities: true,
      mustPredictDocumentaryFootprint: true,
      mustSpecifyDisconfirmingEvidence: true,
      reverseSearchPreferred: true,
    },
    leads: leads.map((lead) => ({
      id: lead.id,
      kind: lead.kind,
      hypothesis: lead.hypothesis,
      rationale: lead.rationale,
      basisEvidenceRefs: lead.basisEvidenceRefs,
      entityIds: lead.entityIds,
      independentLineages: lead.independentLineages,
      documentFamilies: lead.documentFamilies,
      occurredAtRange: lead.occurredAtRange,
      predictedFootprints: lead.predictedFootprints,
      falsifiers: lead.falsifiers,
      searchSeeds: lead.searchSeeds,
    })),
  });
}

export async function planInvestigationHypotheses(input: {
  leads: InvestigationDiscoveryLead[];
  context: AgencyToolContext;
  instructions: string;
  maxHypotheses?: number;
  runAgent?: RunAgent;
}): Promise<InvestigationHypothesisPlan> {
  if (!Array.isArray(input.leads) || input.leads.length === 0 ||
      input.leads.length > 100) {
    throw new Error("investigation_hypothesis_leads_required");
  }
  const maxHypotheses = Math.max(1, Math.min(input.maxHypotheses ?? 6, 6));
  const allowedLeadIds = new Set(input.leads.map((lead) => lead.id));
  const allowedEvidenceRefs = new Set(
    input.leads.flatMap((lead) => lead.basisEvidenceRefs),
  );
  const allowedEntityIds = new Set(
    input.leads.flatMap((lead) => lead.entityIds),
  );
  let selected: InvestigationHypothesisProposal[] | null = null;

  const runAgent = input.runAgent ?? runOpenAIAgencyAgent;
  const result: AgentResult = await runAgent({
    instructions: [
      input.instructions.trim(),
      "",
      "INVESTIGATION HYPOTHESIS MODE:",
      "Use exactly one investigation_propose_hypotheses tool call.",
      "Be imaginative about mechanisms and overlooked connections, but do not invent people, entities, evidence, dates, conduct, or source relationships.",
      "A hypothesis is a search generator, never a finding. Keep confidence below 0.50.",
      "Prefer hypotheses that connect independent document families, bridge nodes, chronology, recurring intermediaries, expected-but-missing footprints, or reverse-path tests.",
      "Try questions humans may not have asked: what shared mechanism could create these records; what intermediary would explain separate clusters; what earlier record should exist if the public timeline is right; what reverse search should reproduce the edge.",
      "Do not infer criminal conduct from association. Do not turn absence into proof. Do not use repeated reporting as independent corroboration.",
      "Every hypothesis must predict concrete documentary footprints and name evidence that would disconfirm it.",
      "Use only the supplied lead IDs, evidence refs, and entity IDs. Do not introduce new named actors.",
      "Search seeds should be bounded and phrased to discover primary records, counterevidence and independent routes, not to confirm the hypothesis.",
    ].join("\n"),
    goal:
      "Generate novel evidence-bounded hypotheses that widen the investigation frontier without promoting any hypothesis to fact.",
    userText: leadContext(input.leads),
    tools: plannerTool(maxHypotheses),
    context: input.context,
    allowWebResearch: false,
    verifyCompletion: false,
    maxRounds: 2,
    executionDelegate: {
      managesWriteIdempotency: true,
      async execute() {
        return {
          kind: "checkpointed",
          reason: "investigation_hypothesis_plan_selected",
        };
      },
    },
    hooks: {
      async onToolSelected({ name, arguments: args }) {
        if (name !== TOOL) {
          throw new Error("investigation_hypothesis_unknown_tool");
        }
        if (selected) {
          throw new Error("investigation_hypothesis_multiple_selections");
        }
        const raw = (args as Record<string, unknown>).proposals;
        if (!Array.isArray(raw) || raw.length === 0 ||
            raw.length > maxHypotheses) {
          throw new Error("investigation_hypothesis_invalid_proposals");
        }
        selected = raw.map((value) =>
          validateProposal({
            value,
            allowedLeadIds,
            allowedEvidenceRefs,
            allowedEntityIds,
          }),
        );
        if (new Set(selected.map((item) => item.id)).size !== selected.length) {
          throw new Error("investigation_hypothesis_duplicate_id");
        }
      },
    },
  });

  if (!selected) {
    throw new Error(
      result.status === "complete"
        ? "investigation_hypothesis_no_selection"
        : "investigation_hypothesis_selection_missing",
    );
  }

  return {
    proposals: selected,
    plannerRule: "creative_but_evidence_bounded",
  };
}
