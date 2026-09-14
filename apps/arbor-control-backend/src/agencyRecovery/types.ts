export type ArborBlockerKind =
  | "permission"
  | "missing_capability"
  | "missing_information"
  | "conflict"
  | "validation_failure"
  | "tool_failure"
  | "host_failure"
  | "state_failure"
  | "unknown";

export interface ArborBlocker {
  id: string;
  kind: ArborBlockerKind;
  message: string;
  failedAction: string;
  goal: string;
  recoverable: boolean;
  evidence: string[];
  createdAt: string;
}

export interface ArborRecoveryContext {
  goal: string;
  blocker: ArborBlocker;
  attemptedOptionIds: string[];
  availableCapabilities: string[];
}

export interface ArborRecoveryResult {
  success: boolean;
  optionId: string;
  evidence: string[];
  nextAction?: string;
  blocker?: ArborBlocker;
}

export interface ArborRecoveryOption {
  id: string;
  description: string;
  preservesGoal: boolean;
  requiresUserInput: boolean;
  confidence: number;
  applicable(context: ArborRecoveryContext): boolean;
  execute(context: ArborRecoveryContext): Promise<ArborRecoveryResult>;
}

export interface ArborAgencyDecision {
  status: "completed" | "recovered" | "blocked" | "needs_user";
  blocker?: ArborBlocker;
  attemptedOptionIds: string[];
  evidence: string[];
  selectedOptionId?: string;
  nextAction?: string;
  requiredUserInput?: string;
}
