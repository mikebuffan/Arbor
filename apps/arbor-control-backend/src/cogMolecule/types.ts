export type CogDisposition =
  | "assert"
  | "circulate"
  | "abstain"
  | "seek_more_information";

export type CogEvidence = {
  id: string;
  value: unknown;
  provenance: string[];
  confidence: number;
};

export type CogHypothesis = {
  id: string;
  value: unknown;
  confidence: number;
  support: string[];
  contradictions: string[];
};

export type CogPacket = {
  id: string;
  destination?: string;
  evidence: CogEvidence[];
  hypotheses: CogHypothesis[];
  unresolved: string[];
  provenance: string[];
  friction: number;
  circulation: number;
  metadata: Record<string, unknown>;
};

export type CogObservation = {
  packet: CogPacket;
  frictionDelta: number;
  reasons: string[];
};

export type CogContext = {
  round: number;
  maxRounds: number;
};

export type Cog = {
  id: string;
  process(packet: CogPacket, context: CogContext): Promise<CogObservation>;
};

export type ValidationResult = {
  valid: boolean;
  reasons: string[];
  seek?: string[];
};

export type ReleaseProjection = {
  disposition: CogDisposition;
  packet: CogPacket;
  ordered: unknown[];
  provenance: string[];
  confidence: number;
  friction: number;
  reasons: string[];
};

export type MoleculeResult = {
  disposition: CogDisposition;
  packet: CogPacket;
  projection?: ReleaseProjection;
  rounds: number;
  reasons: string[];
};