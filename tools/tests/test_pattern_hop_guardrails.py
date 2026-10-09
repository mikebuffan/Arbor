import unittest

from tools.pattern_hop_guardrails import (
    Claim,
    EvidenceLevel,
    Hop,
    IdentityRecord,
    SourceRef,
    corroboration_count,
    detect_contradictions,
    evaluate_pattern_hop,
    identity_gate,
    reverse_hop_missing_levels,
    score_evidence_hop,
    validate_state_transition,
)


class PatternHopGuardrailTests(unittest.TestCase):
    def setUp(self):
        self.primary = SourceRef("doc-a", "family-primary", "email", "original email")
        self.forward = SourceRef("doc-b", "family-primary", "news", "reports same email")
        self.independent = SourceRef("doc-c", "family-independent", "court", "court record")

    def test_evidence_ladder_does_not_promote(self):
        self.assertEqual(score_evidence_hop(direct_communication=True), EvidenceLevel.DIRECT_COMMUNICATION)

    def test_source_family_deduper(self):
        self.assertEqual(corroboration_count([self.primary, self.forward, self.independent]), 2)

    def test_same_name_different_person_stays_unmerged(self):
        a = IdentityRecord("a", "Alex Morgan", organization="North Org", role="Director")
        b = IdentityRecord("b", "Alex Morgan", organization="South Org", role="Director")
        decision = identity_gate(a, b)
        self.assertFalse(decision.merge_allowed)
        self.assertIn("organization", decision.conflicts)

    def test_identity_can_merge_with_strong_matching_metadata(self):
        a = IdentityRecord("a", "Alex Morgan", organization="North Org", role="Director",
                           contact_metadata=("alex@example.test",), provenance_ids=("p1",))
        b = IdentityRecord("b", "Alex Morgan", organization="North Org", role="Director",
                           contact_metadata=("alex@example.test",), provenance_ids=("p2",))
        self.assertTrue(identity_gate(a, b).merge_allowed)

    def test_conflicting_testimony_vs_contemporaneous_record(self):
        c1 = Claim("1", "Person A", "called", "Person B", "completed", self.primary, date="2020-01-01")
        c2 = Claim("2", "Person A", "called", "Person C", "completed", self.independent, date="2020-01-01")
        conflicts = detect_contradictions([c1, c2])
        self.assertEqual(len(conflicts), 1)
        self.assertIn("object", conflicts[0].fields)

    def test_planned_trip_not_equal_completed_travel(self):
        self.assertFalse(validate_state_transition("scheduled", "completed"))
        self.assertTrue(validate_state_transition("scheduled", "completed", explicit_support=True))

    def test_warning_sent_not_equal_acknowledged(self):
        self.assertFalse(validate_state_transition("requested", "acknowledged"))

    def test_approval_not_equal_implementation(self):
        self.assertFalse(validate_state_transition("approved", "implemented"))

    def test_reverse_hop_flags_missing_decision_layers(self):
        hops = [
            Hop("Org", "Outcome", EvidenceLevel.INDEPENDENT_CONSEQUENCE, self.independent),
            Hop("Person", "Org", EvidenceLevel.DOCUMENTED_ACTION, self.primary),
        ]
        missing = reverse_hop_missing_levels(hops)
        self.assertIn(EvidenceLevel.INSTRUCTION_OR_APPROVAL, missing)
        self.assertIn(EvidenceLevel.ACKNOWLEDGED_RECEIPT, missing)

    def test_combined_pattern_hop_evaluation(self):
        hops = [
            Hop("Source", "Person A", EvidenceLevel.DIRECT_COMMUNICATION, self.primary),
            Hop("Person A", "Decision", EvidenceLevel.ACKNOWLEDGED_RECEIPT, self.primary),
            Hop("Decision", "Action", EvidenceLevel.INSTRUCTION_OR_APPROVAL, self.primary),
            Hop("Action", "Outcome", EvidenceLevel.DOCUMENTED_ACTION, self.primary),
            Hop("Outcome", "Public Record", EvidenceLevel.INDEPENDENT_CONSEQUENCE, self.independent),
        ]
        claims = [
            Claim("c1", "Person A", "approved", "Action X", "approved", self.primary),
            Claim("c2", "Person A", "approved", "Action Y", "approved", self.independent),
        ]
        summary = evaluate_pattern_hop(hops=hops, claims=claims)
        self.assertEqual(summary["highest_evidence_level"], EvidenceLevel.INDEPENDENT_CONSEQUENCE)
        self.assertEqual(summary["independent_source_family_count"], 2)
        self.assertEqual(summary["reverse_hop_missing_levels"], [])
        self.assertEqual(len(summary["contradictions"]), 1)


if __name__ == "__main__":
    unittest.main()
