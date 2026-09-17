import type { ArborState } from "../types.js";
import type { CogPacket, MoleculeResult } from "./types.js";

export function carrierStateToPacket(state: ArborState, id: string, destination?: string): CogPacket {
  const unresolved = [
    ...(state.goal?.trim() ? [`goal:${state.goal.trim()}`] : []),
    ...state.unresolvedWork.map((item) => `open:${item}`),
  ];

  return {
    id,
    destination,
    evidence: [
      {
        id: "carrier:strategy-notes",
        value: [...state.strategyNotes],
        provenance: ["arbor:durable-carrier"],
        confidence: 1,
      },
      {
        id: "carrier:corrections",
        value: [...(state.behavioralCorrections ?? [])],
        provenance: ["arbor:durable-carrier"],
        confidence: 1,
      },
    ],
    hypotheses: [],
    unresolved,
    challenges: [],
    provenance: ["arbor:durable-carrier"],
    friction: 0,
    circulation: 0,
    metadata: {
      activeSubsystem: state.activeSubsystem,
      selfModelVersion: state.selfModel?.version,
      carrierGoal: state.goal,
    },
  };
}

export function applyMoleculeResultToCarrier(state: ArborState, result: MoleculeResult): ArborState {
  const next = structuredClone(state);

  // Molecule processing may update active work, but identity/corrections remain
  // host-owned durable state. Never let a packet rewrite the self-model root.
  next.unresolvedWork = result.packet.unresolved
    .filter((item) => item.startsWith("open:"))
    .map((item) => item.slice("open:".length));

  const goal = result.packet.unresolved.find((item) => item.startsWith("goal:"));
  if (goal) next.goal = goal.slice("goal:".length);
  else if (result.disposition === "assert") next.goal = null;

  return next;
}