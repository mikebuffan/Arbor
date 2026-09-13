const CAPABILITY_STAGE = /^(?:execute|recover) capability: (.+)$/;
const CAPABILITY_VERIFICATION = /^verify capability result: (.+)$/;

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

export function mergeAgencyUnresolvedWork(
  current: string[],
  incoming: string[],
): string[] {
  const next = uniqueWork(incoming);
  if (!next.length) return [];

  // Verifier output is authoritative for the next graph frontier. Capability
  // markers are transient observations and must never collapse sibling work.
  if (next.some((item) => capabilityOf(item) === null)) {
    return next;
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
