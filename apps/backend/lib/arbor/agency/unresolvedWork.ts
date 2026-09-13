const CAPABILITY_STAGE = /^(?:execute|recover) capability: (.+)$/;
const CAPABILITY_VERIFICATION = /^verify capability result: (.+)$/;
const GOAL_OWNERSHIP = /^(?:complete|continue) goal: (.+)$/;
const FINALIZE_VERIFIED_GOAL = /^finalize verified goal$/;

function uniqueWork(items: string[]): string[] {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean)),
  ).slice(-40);
}

function capabilityOf(item: string): string | null {
  const stage = CAPABILITY_STAGE.exec(item);
  if (stage?.[1]) return stage[1].trim();

  const verification = CAPABILITY_VERIFICATION.exec(item);
  return verification?.[1]?.trim() || null;
}

function isGoalOwnership(item: string): boolean {
  return GOAL_OWNERSHIP.test(item) || FINALIZE_VERIFIED_GOAL.test(item);
}

function durableGoalOwnership(current: string[]): string[] {
  return uniqueWork(current).filter(isGoalOwnership);
}

export function mergeAgencyUnresolvedWork(
  current: string[],
  incoming: string[],
): string[] {
  const next = uniqueWork(incoming);
  if (!next.length) return [];

  // A verifier may replace the detailed frontier, but it must not accidentally
  // erase ownership of the still-active goal. Goal ownership disappears only
  // when completion is explicitly committed with an empty frontier.
  if (next.some((item) => capabilityOf(item) === null)) {
    const incomingOwnsGoal = next.some(isGoalOwnership);
    return incomingOwnsGoal
      ? next
      : uniqueWork([...durableGoalOwnership(current), ...next]);
  }

  const capabilities = new Set(
    next
      .map(capabilityOf)
      .filter((value): value is string => Boolean(value)),
  );

  const preserved = uniqueWork(current).filter((item) => {
    const capability = capabilityOf(item);
    return capability === null || !capabilities.has(capability);
  });

  return uniqueWork([...preserved, ...next]);
}
