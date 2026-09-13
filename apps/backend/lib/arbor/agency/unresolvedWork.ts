const CAPABILITY_WORK = /^(execute|verify|recover) capability: (.+)$/;

function uniqueWork(items: string[]): string[] {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean)),
  ).slice(-40);
}

export function mergeAgencyUnresolvedWork(
  current: string[],
  incoming: string[],
): string[] {
  const next = uniqueWork(incoming);
  if (!next.length) return [];

  // Verifier output is authoritative for the next graph frontier. Capability
  // markers are transient observations and must never collapse sibling work.
  if (next.some((item) => !CAPABILITY_WORK.test(item))) {
    return next;
  }

  const capabilities = new Set(
    next
      .map((item) => CAPABILITY_WORK.exec(item)?.[2]?.trim())
      .filter((value): value is string => Boolean(value)),
  );

  const preserved = uniqueWork(current).filter((item) => {
    const match = CAPABILITY_WORK.exec(item);
    return !match || !capabilities.has(match[2].trim());
  });

  return uniqueWork([...preserved, ...next]);
}
