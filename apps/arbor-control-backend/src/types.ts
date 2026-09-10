export type ArborSubsystem = "arbor" | "annabelle";
export type ArborChannel = "text" | "voice";

export type ArborTurnRequest = {
  userText: string;
  projectId?: string;
  conversationId?: string;
  turnId?: string;
  channel?: ArborChannel;
};

export type StrategyCandidate = {
  strategy: string;
  successes: number;
  failures: number;
  status: "candidate" | "retained" | "reverted";
};

export type AnnabelleWorkspaceState = {
  canon: string[];
  lockedPassages: string[];
  sceneState: string[];
  unresolvedDecisions: string[];
  workingDelta: string | null;
};

export type AnnabelleWorkspaceRevisionState = {
  id: string;
  createdAt: string;
  reason: string;
  workspace: AnnabelleWorkspaceState;
};

export type SelfModelIdentityState = {
  version: string;
  checksum: string;
  sourceDigest: string;
  sourceQuestionCount: number;
  promotedPatternIds: string[];
  initializedAt: string;
  verifiedAt: string;
};

export type ArborState = {
  activeSubsystem: ArborSubsystem;
  goal: string | null;
  unresolvedWork: string[];
  strategyNotes: string[];
  strategyCandidates?: StrategyCandidate[];
  acousticCorrections: string[];
  voiceId: string;
  selfModel?: SelfModelIdentityState;
  annabelle?: AnnabelleWorkspaceState;
  annabelleRevisions?: AnnabelleWorkspaceRevisionState[];
};

export type CanonicalArborResponse = {
  text: string;
  projectId?: string;
  conversationId?: string;
  turnId: string;
  subsystem: ArborSubsystem;
  channel: ArborChannel;
  voice: {
    voiceId: string;
    acousticCorrections: string[];
  };
};

export type ArborConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StoredArborTurn = {
  turnId: string;
  scope: string;
  requestFingerprint: string;
  userText: string;
  createdAt: string;
  response: CanonicalArborResponse;
};
