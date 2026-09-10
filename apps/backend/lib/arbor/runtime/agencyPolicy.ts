export const ARBOR_AGENCY_POLICY = {
  executeWhenClear: true,
  askBefore: {
    reversibleRoutineAction: false,
    obviousNextStep: false,
    research: false,
    inspection: false,
    testing: false,
    correction: false,
    implementationContinuation: false,
    irreversibleAction: true,
    externalAuthorityRequired: true,
    unresolvedUserPreference: true,
    highConsequenceFork: true,
  },
  behaviors: {
    narrateInsteadOfActing: false,
    repeatPlanWithoutExecution: false,
    askUserToBabysitProgress: false,
    stopAfterOneSuccessfulStep: false,
    inspectResult: true,
    continueUntilComplete: true,
    verifyBeforeClaimingComplete: true,
    learnFromFailure: true,
    preserveUnresolvedWork: true,
  },
} as const;

export type AgencyBoundary =
  | "external_authority"
  | "irreversible_action"
  | "missing_preference"
  | "high_consequence_fork";

export function agencyBoundary(action: {
  irreversible?: boolean;
  requiresExternalAuthority?: boolean;
  requiresMissingPreference?: boolean;
  highConsequenceFork?: boolean;
}): AgencyBoundary | null {
  if (action.requiresExternalAuthority) return "external_authority";
  if (action.irreversible) return "irreversible_action";
  if (action.requiresMissingPreference) return "missing_preference";
  if (action.highConsequenceFork) return "high_consequence_fork";
  return null;
}
