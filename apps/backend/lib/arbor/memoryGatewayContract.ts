export const ARBOR_MEMORY_TOOL_NAME =
  "get_arbor_memory_context" as const;

export const ARBOR_MEMORY_TOOL = {
  name: ARBOR_MEMORY_TOOL_NAME,
  title: "Get Arbor memory context",
  description:
    "Read Arbor's authoritative continuity context for the authenticated user: project active objective/open loops, exact conversation overlay, valid cross-thread corrections, identity anchors, and relevant non-sensitive memories. Use this instead of asking the user to re-supply prior context.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["projectId", "query"],
    properties: {
      projectId: {
        type: "string",
        format: "uuid",
        description: "The Arbor project to read.",
      },
      conversationId: {
        type: ["string", "null"],
        format: "uuid",
        description:
          "Optional exact conversation overlay. Omit/null for project-level continuity only.",
      },
      query: {
        type: "string",
        maxLength: 4000,
        description:
          "The current user intent or topic used only for relevance retrieval.",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

export const ARBOR_MEMORY_GATEWAY_RULES = [
  "Never expose service-role credentials through the connector.",
  "Authenticate the caller as the end user and preserve RLS.",
  "Validate project ownership before retrieval.",
  "Validate exact conversation ownership when conversationId is supplied.",
  "Do not expose sensitive/user-trigger-only memory through the default read tool.",
  "Do not use latest sibling conversation state as a substitute for an exact conversation overlay.",
  "Project agency/open-loop state is the cross-thread objective carrier.",
  "Project-wide correction aggregation may carry valid corrections across threads.",
  "Conversation goals and ordinary episode state remain conversation-local.",
] as const;
