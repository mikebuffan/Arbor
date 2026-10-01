import {
  runOpenAIAgencyAgent,
  type AgentResult,
} from "@/lib/arbor/agency/openaiAgent";
import {
  AgencyToolRegistry,
  type AgencyToolContext,
} from "@/lib/arbor/agency/tools";

type RunAgent = typeof runOpenAIAgencyAgent;

export type InvestigationQuestionCandidate = {
  id: string;
  sourceRef: string;
  lineageKey: string;
  questionText: string;
  mentionedEntityIds: string[];
  proposedAnswerText?: string | null;
};

export type InvestigationQuestionSeed = {
  id: string;
  sourceCandidateIds: string[];
  neutralQuestion: string;
  inheritedAssumptions: string[];
  entityIds: string[];
  primarySourceTargets: string[];
  disconfirmingSearches: string[];
  searchSeeds: string[];
  status: "unresolved_question";
};

export type InvestigationQuestionPlan = {
  questions: InvestigationQuestionSeed[];
  rule: "question_without_inherited_answer";
};

const TOOL = "investigation_submit_question_seeds";

function text(value: unknown, field: string, max = 8000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_question_invalid_" + field);
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
    throw new Error("investigation_question_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 2000));
  if (new Set(out).size !== out.length) {
    throw new Error("investigation_question_duplicate_" + field);
  }
  return out;
}

function validateCandidate(
  candidate: InvestigationQuestionCandidate,
): InvestigationQuestionCandidate {
  return {
    id: text(candidate.id, "candidate_id", 300),
    sourceRef: text(candidate.sourceRef, "source_ref", 1000),
    lineageKey: text(candidate.lineageKey, "lineage_key", 1000),
    questionText: text(candidate.questionText, "question_text", 8000),
    mentionedEntityIds: strings(
      candidate.mentionedEntityIds,
      "mentioned_entity_ids",
      0,
      50,
    ),
    proposedAnswerText:
      candidate.proposedAnswerText === null ||
      candidate.proposedAnswerText === undefined
        ? null
        : text(candidate.proposedAnswerText, "proposed_answer_text", 8000),
  };
}

function plannerTool(maxQuestions: number): AgencyToolRegistry {
  const neverExecute = async () => {
    throw new Error("investigation_question_tool_must_not_execute");
  };
  return new AgencyToolRegistry().register({
    name: TOOL,
    description:
      "Convert sourced public questions into neutral unresolved investigation questions without inheriting their proposed answers.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 1,
          maxItems: maxQuestions,
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1, maxLength: 300 },
              sourceCandidateIds: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                items: { type: "string", minLength: 1, maxLength: 300 },
              },
              neutralQuestion: {
                type: "string",
                minLength: 1,
                maxLength: 8000,
              },
              inheritedAssumptions: {
                type: "array",
                minItems: 0,
                maxItems: 20,
                items: { type: "string", minLength: 1, maxLength: 2000 },
              },
              entityIds: {
                type: "array",
                minItems: 0,
                maxItems: 50,
                items: { type: "string", minLength: 1, maxLength: 300 },
              },
              primarySourceTargets: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                items: { type: "string", minLength: 1, maxLength: 2000 },
              },
              disconfirmingSearches: {
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
              status: {
                type: "string",
                enum: ["unresolved_question"],
              },
            },
            required: [
              "id",
              "sourceCandidateIds",
              "neutralQuestion",
              "inheritedAssumptions",
              "entityIds",
              "primarySourceTargets",
              "disconfirmingSearches",
              "searchSeeds",
              "status",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
    execute: neverExecute,
  });
}

function validateSeed(input: {
  raw: unknown;
  allowedCandidateIds: Set<string>;
  allowedEntityIds: Set<string>;
}): InvestigationQuestionSeed {
  if (!input.raw || typeof input.raw !== "object" ||
      Array.isArray(input.raw)) {
    throw new Error("investigation_question_invalid_seed");
  }
  const r = input.raw as Record<string, unknown>;
  const sourceCandidateIds = strings(
    r.sourceCandidateIds,
    "source_candidate_ids",
    1,
    20,
  );
  const entityIds = strings(r.entityIds, "entity_ids", 0, 50);
  if (sourceCandidateIds.some((id) => !input.allowedCandidateIds.has(id))) {
    throw new Error("investigation_question_unknown_candidate");
  }
  if (entityIds.some((id) => !input.allowedEntityIds.has(id))) {
    throw new Error("investigation_question_unknown_entity");
  }
  if (r.status !== "unresolved_question") {
    throw new Error("investigation_question_status_must_be_unresolved");
  }

  return {
    id: text(r.id, "seed_id", 300),
    sourceCandidateIds,
    neutralQuestion: text(r.neutralQuestion, "neutral_question", 8000),
    inheritedAssumptions: strings(
      r.inheritedAssumptions,
      "inherited_assumptions",
      0,
      20,
    ),
    entityIds,
    primarySourceTargets: strings(
      r.primarySourceTargets,
      "primary_source_targets",
      1,
      20,
    ),
    disconfirmingSearches: strings(
      r.disconfirmingSearches,
      "disconfirming_searches",
      1,
      20,
    ),
    searchSeeds: strings(r.searchSeeds, "search_seeds", 1, 12),
    status: "unresolved_question",
  };
}

export async function planInvestigationQuestions(input: {
  candidates: InvestigationQuestionCandidate[];
  instructions: string;
  context: AgencyToolContext;
  maxQuestions?: number;
  runAgent?: RunAgent;
}): Promise<InvestigationQuestionPlan> {
  if (!Array.isArray(input.candidates) ||
      input.candidates.length < 1 ||
      input.candidates.length > 200) {
    throw new Error("investigation_question_candidates_required");
  }
  const candidates = input.candidates.map(validateCandidate);
  const allowedCandidateIds = new Set(candidates.map((item) => item.id));
  const allowedEntityIds = new Set(
    candidates.flatMap((item) => item.mentionedEntityIds),
  );
  const maxQuestions = Math.max(1, Math.min(input.maxQuestions ?? 20, 50));
  const runAgent = input.runAgent ?? runOpenAIAgencyAgent;
  let selected: InvestigationQuestionSeed[] | null = null;

  const result: AgentResult = await runAgent({
    instructions: [
      input.instructions.trim(),
      "",
      "INVESTIGATION QUESTION MINING MODE:",
      "Use exactly one investigation_submit_question_seeds tool call.",
      "Harvest the unresolved question, not the source author's proposed answer.",
      "Separate inherited assumptions explicitly. Do not smuggle those assumptions into the neutral question.",
      "Do not introduce named entities that were not supplied by the candidate set.",
      "Merge duplicate questions only when they ask the same factual question; preserve their source candidate IDs so repetition can later be checked for shared lineage.",
      "Every question must identify primary-source targets and at least one search capable of disproving the implied theory.",
      "Questions are leads only. Popularity, repetition, outrage or notoriety does not increase evidentiary weight.",
    ].join("\n"),
    goal:
      "Build a neutral unresolved-question reservoir that widens the investigation without inheriting internet theories as facts.",
    userText: JSON.stringify({
      mode: "question_mining",
      candidates,
    }),
    tools: plannerTool(maxQuestions),
    context: input.context,
    allowWebResearch: false,
    verifyCompletion: false,
    maxRounds: 2,
    executionDelegate: {
      managesWriteIdempotency: true,
      async execute() {
        return {
          kind: "checkpointed",
          reason: "investigation_question_plan_selected",
        };
      },
    },
    hooks: {
      async onToolSelected({ name, arguments: args }) {
        if (name !== TOOL) {
          throw new Error("investigation_question_unknown_tool");
        }
        if (selected) {
          throw new Error("investigation_question_multiple_selections");
        }
        const raw = (args as Record<string, unknown>).questions;
        if (!Array.isArray(raw) ||
            raw.length < 1 ||
            raw.length > maxQuestions) {
          throw new Error("investigation_question_invalid_questions");
        }
        selected = raw.map((item) =>
          validateSeed({
            raw: item,
            allowedCandidateIds,
            allowedEntityIds,
          }),
        );
        if (new Set(selected.map((item) => item.id)).size !== selected.length) {
          throw new Error("investigation_question_duplicate_seed_id");
        }
      },
    },
  });

  if (!selected) {
    throw new Error(
      result.status === "complete"
        ? "investigation_question_no_selection"
        : "investigation_question_selection_missing",
    );
  }

  return {
    questions: selected,
    rule: "question_without_inherited_answer",
  };
}
