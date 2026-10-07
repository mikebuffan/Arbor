export const CONTEXTUAL_REFERENCE_SYNTHETIC_FIXTURES = [
  {
    id: "unique_that_one",
    raw: "that one",
    expected: "resolved",
  },
  {
    id: "ambiguous_that_one",
    raw: "that one",
    expected: "clarify",
  },
  {
    id: "first_option",
    raw: "the first one",
    expected: "resolved",
  },
  {
    id: "other_of_two",
    raw: "the other one",
    expected: "resolved",
  },
  {
    id: "other_of_three",
    raw: "the other one",
    expected: "clarify",
  },
  {
    id: "go_unique_active",
    raw: "go",
    expected: "resolved",
  },
  {
    id: "go_multiple_active",
    raw: "go",
    expected: "clarify",
  },
  {
    id: "literal_no",
    raw: "no",
    expected: "control",
  },
  {
    id: "literal_wait",
    raw: "wait",
    expected: "control",
  },
  {
    id: "literal_stop",
    raw: "stop",
    expected: "control",
  },
  {
    id: "no_wait",
    raw: "no wait",
    expected: "control",
  },
  {
    id: "no_comma_wait",
    raw: "no, wait",
    expected: "control",
  },
  {
    id: "compound_stop_keep",
    raw: "stop that one but keep the other",
    expected: "clarify",
  },
  {
    id: "again_failed",
    raw: "again",
    expected: "resolved",
  },
  {
    id: "same_thing_success",
    raw: "same thing",
    expected: "resolved",
  },
  {
    id: "prompt_short_turn",
    raw: "prompt?",
    expected: "resolved",
  },
  {
    id: "your_turn",
    raw: "your turn",
    expected: "resolved",
  },
  {
    id: "what_now",
    raw: "what now",
    expected: "resolved",
  },
  {
    id: "topic_return",
    raw: "that one",
    expected: "resolved",
  },
  {
    id: "subsystem_return",
    raw: "go",
    expected: "resolved",
  },
  {
    id: "corrected_referent",
    raw: "no, the other one",
    expected: "resolved",
  },
  {
    id: "named_entity_collision",
    raw: "ARK, not Arbor",
    expected: "use_literal",
  },
  {
    id: "pr_collision",
    raw: "PR #290",
    expected: "use_literal",
  },
  {
    id: "branch_collision",
    raw: "use feature/contextual-reference-resolution-20261006",
    expected: "use_literal",
  },
  {
    id: "h214_h216_collision",
    raw: "H214",
    expected: "use_literal",
  },
  {
    id: "stale_context_trap",
    raw: "that one",
    expected: "resolved",
  },
  {
    id: "multiple_workstream_trap",
    raw: "go",
    expected: "clarify",
  },
  {
    id: "high_consequence_deictic",
    raw: "delete that one",
    expected: "clarify",
  },
  {
    id: "harmless_reversible",
    raw: "open that one",
    expected: "resolved",
  },
  {
    id: "voice_interruption_continue",
    raw: "keep going",
    expected: "resolved",
  },
  {
    id: "cognitive_access_bridge",
    raw: "tha one",
    working: "that one",
    expected: "resolved",
  },
  {
    id: "unresolved_deictic",
    raw: "that one",
    expected: "clarify",
  },
] as const;
