from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Iterable, Mapping, Sequence


class EvidenceLevel(IntEnum):
    CO_MENTION = 1
    INDIRECT_RELAY = 2
    DIRECT_COMMUNICATION = 3
    ACKNOWLEDGED_RECEIPT = 4
    INSTRUCTION_OR_APPROVAL = 5
    DOCUMENTED_ACTION = 6
    INDEPENDENT_CONSEQUENCE = 7


CLAIM_STATE_ORDER = {
    "discussed": 1,
    "proposed": 2,
    "requested": 3,
    "scheduled": 4,
    "approved": 5,
    "acknowledged": 6,
    "attempted": 7,
    "implemented": 8,
    "completed": 9,
    "independently_verified": 10,
}


@dataclass(frozen=True)
class SourceRef:
    source_id: str
    family_id: str
    kind: str
    provenance: str = ""


@dataclass(frozen=True)
class Claim:
    claim_id: str
    subject: str
    predicate: str
    object: str
    state: str
    source: SourceRef
    date: str | None = None
    location: str | None = None
    certainty: float = 1.0


@dataclass(frozen=True)
class IdentityRecord:
    entity_id: str
    full_name: str
    aliases: tuple[str, ...] = ()
    organization: str | None = None
    role: str | None = None
    date_context: str | None = None
    contact_metadata: tuple[str, ...] = ()
    provenance_ids: tuple[str, ...] = ()


@dataclass
class IdentityDecision:
    merge_allowed: bool
    score: int
    matched_fields: list[str] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)
    unresolved: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Hop:
    source_entity: str
    target_entity: str
    level: EvidenceLevel
    source: SourceRef
    description: str = ""


@dataclass
class Contradiction:
    claim_a: Claim
    claim_b: Claim
    fields: list[str]


def score_evidence_hop(*, co_mention=False, indirect_relay=False,
                        direct_communication=False, acknowledged_receipt=False,
                        instruction_or_approval=False, documented_action=False,
                        independent_consequence=False) -> EvidenceLevel:
    """Return the highest explicitly demonstrated evidence level.

    The function never infers a higher state from a lower one.
    """
    checks = [
        (EvidenceLevel.CO_MENTION, co_mention),
        (EvidenceLevel.INDIRECT_RELAY, indirect_relay),
        (EvidenceLevel.DIRECT_COMMUNICATION, direct_communication),
        (EvidenceLevel.ACKNOWLEDGED_RECEIPT, acknowledged_receipt),
        (EvidenceLevel.INSTRUCTION_OR_APPROVAL, instruction_or_approval),
        (EvidenceLevel.DOCUMENTED_ACTION, documented_action),
        (EvidenceLevel.INDEPENDENT_CONSEQUENCE, independent_consequence),
    ]
    explicit = [level for level, present in checks if present]
    if not explicit:
        raise ValueError("At least one evidence signal must be explicit.")
    return max(explicit)


def independent_source_families(sources: Iterable[SourceRef]) -> dict[str, list[SourceRef]]:
    """Group source records by underlying source family."""
    grouped: dict[str, list[SourceRef]] = {}
    for source in sources:
        grouped.setdefault(source.family_id, []).append(source)
    return grouped


def corroboration_count(sources: Iterable[SourceRef]) -> int:
    """Count independent source families, not documents."""
    return len(independent_source_families(sources))


def identity_gate(a: IdentityRecord, b: IdentityRecord, *, minimum_score: int = 5) -> IdentityDecision:
    """Conservatively decide whether two identity records may be merged."""
    matched: list[str] = []
    conflicts: list[str] = []
    unresolved: list[str] = []
    score = 0

    def same_text(label: str, va: str | None, vb: str | None, weight: int):
        nonlocal score
        if not va or not vb:
            unresolved.append(label)
        elif va.casefold().strip() == vb.casefold().strip():
            matched.append(label)
            score += weight
        else:
            conflicts.append(label)

    same_text("full_name", a.full_name, b.full_name, 3)
    same_text("organization", a.organization, b.organization, 2)
    same_text("role", a.role, b.role, 2)
    same_text("date_context", a.date_context, b.date_context, 1)

    if {x.casefold().strip() for x in a.aliases} & {x.casefold().strip() for x in b.aliases}:
        matched.append("aliases")
        score += 1
    if set(a.contact_metadata) & set(b.contact_metadata):
        matched.append("contact_metadata")
        score += 3
    if set(a.provenance_ids) & set(b.provenance_ids):
        matched.append("provenance")
        score += 1

    hard_conflict = "full_name" in conflicts or "organization" in conflicts
    return IdentityDecision(
        merge_allowed=(not hard_conflict and score >= minimum_score),
        score=score,
        matched_fields=matched,
        conflicts=conflicts,
        unresolved=unresolved,
    )


def detect_contradictions(claims: Sequence[Claim]) -> list[Contradiction]:
    """Flag conflicts while preserving both claims and provenance."""
    out: list[Contradiction] = []
    for i, a in enumerate(claims):
        for b in claims[i + 1:]:
            if a.subject.casefold() != b.subject.casefold():
                continue
            if a.predicate.casefold() != b.predicate.casefold():
                continue
            conflicts: list[str] = []
            if a.object.casefold() != b.object.casefold():
                conflicts.append("object")
            if a.date and b.date and a.date != b.date:
                conflicts.append("date")
            if a.location and b.location and a.location.casefold() != b.location.casefold():
                conflicts.append("location")
            if a.state != b.state:
                conflicts.append("state")
            if conflicts:
                out.append(Contradiction(a, b, conflicts))
    return out


def validate_state_transition(current: str, proposed: str, *, explicit_support: bool = False) -> bool:
    """Require explicit support for upward claim-state promotion."""
    if current not in CLAIM_STATE_ORDER or proposed not in CLAIM_STATE_ORDER:
        raise ValueError("Unknown claim state.")
    if CLAIM_STATE_ORDER[proposed] <= CLAIM_STATE_ORDER[current]:
        return True
    return explicit_support


def reverse_hop_missing_levels(hops: Sequence[Hop]) -> list[EvidenceLevel]:
    """Identify missing ladder steps without inventing causal links."""
    present = {hop.level for hop in hops}
    if EvidenceLevel.INDEPENDENT_CONSEQUENCE not in present:
        raise ValueError("Reverse hop requires a documented consequence.")
    required = [
        EvidenceLevel.DOCUMENTED_ACTION,
        EvidenceLevel.INSTRUCTION_OR_APPROVAL,
        EvidenceLevel.ACKNOWLEDGED_RECEIPT,
        EvidenceLevel.DIRECT_COMMUNICATION,
    ]
    return [level for level in required if level not in present]


def evaluate_pattern_hop(
    *,
    hops: Sequence[Hop],
    claims: Sequence[Claim],
    identities: Sequence[tuple[IdentityRecord, IdentityRecord]] = (),
) -> Mapping[str, object]:
    """Produce a non-mutating evaluation summary for a candidate pattern hop."""
    source_groups = independent_source_families(
        [hop.source for hop in hops] + [claim.source for claim in claims]
    )
    identity_results = [identity_gate(a, b) for a, b in identities]
    return {
        "highest_evidence_level": max((hop.level for hop in hops), default=None),
        "independent_source_family_count": len(source_groups),
        "source_family_ids": sorted(source_groups),
        "contradictions": detect_contradictions(claims),
        "identity_decisions": identity_results,
        "reverse_hop_missing_levels": (
            reverse_hop_missing_levels(hops)
            if any(hop.level == EvidenceLevel.INDEPENDENT_CONSEQUENCE for hop in hops)
            else []
        ),
    }
