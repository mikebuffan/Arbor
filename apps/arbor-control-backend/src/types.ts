export type ArborSubsystem = "arbor" | "annabelle";
export type ArborChannel = "text" | "voice";

export type ArborTurnRequest = {
  userText: string;
  projectId?: string;
  conversationId?: string;
  turnId?: string;
  channel?: ArborChannel;
};

export type ArborState = {
  activeSubsystem: ArborSubsystem;
  goal: string | null;
  unresolvedWork: string[];
  strategyNotes: string[];
  acousticCorrections: string[];
  voiceId: string;
  annabelle?: {
    canon: string[];
    lockedPassages: string[];
    sceneState: string[];
    unresolvedDecisions: string[];
    workingDelta: string | null;
  };
};

export type CanonicalArborResponse = {
  text: string;
  projectId?: string;
  conversationId?: string;
  turnId: string;
  subsystem: ArborSubsystem;
  channel: ArborChannel;
};
