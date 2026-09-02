import { describe, expect, it } from "vitest";
import {
  isEligibleConfirmationCandidate,
  selectEligibleConfirmationCandidate,
  type PendingConfirmationRow,
} from "@/lib/memory/confirmationEligibility";

const base = {
  user_id: "user-a",
  project_id: "project-a",
};

describe("memory confirmation eligibility", () => {
  it("selects an older explicit candidate instead of a newer operational row", () => {
    const rows: PendingConfirmationRow[] = [
      {
        ...base,
        id: "newer-operational-row",
        question: "memory_event",
        ops: { kind: "memory_event", event_type: "reinforced" },
        event_type: "reinforced",
        created_at: "2026-08-08T02:00:00.000Z",
      },
      {
        ...base,
        id: "older-confirmation-candidate",
        question: "Should I remember this preference?",
        ops: [{ key: "favorite_color", value: { text: "green" } }],
        event_type: null,
        created_at: "2026-08-08T01:00:00.000Z",
      },
    ];

    expect(selectEligibleConfirmationCandidate(rows)?.id).toBe(
      "older-confirmation-candidate",
    );
    expect(isEligibleConfirmationCandidate(rows[0])).toBe(false);
  });

  it("rejects event-shaped and malformed rows as user confirmation intent", () => {
    const rows: PendingConfirmationRow[] = [
      {
        ...base,
        id: "event",
        question: "memory_event",
        ops: [{ key: "should_not_apply", value: "no" }],
        event_type: "chat_completed",
        created_at: "2026-08-08T02:00:00.000Z",
      },
      {
        ...base,
        id: "malformed",
        question: "Looks like a question",
        ops: { key: "not-an-array" },
        event_type: null,
        created_at: "2026-08-08T01:00:00.000Z",
      },
    ];

    expect(selectEligibleConfirmationCandidate(rows)).toBeNull();
  });
});
