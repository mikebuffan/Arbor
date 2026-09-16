const DURABLE_AUTH_PATTERNS: RegExp[] = [
  /\bhard\s+rule\b/i,
  /\bremember\s+(?:this|that)\b/i,
  /\b(?:save|store|keep|lock)\s+(?:this|that)\b/i,
  /\bmake\s+(?:this|that)\s+(?:permanent|durable|a\s+rule)\b/i,
  /\bfrom\s+now\s+on\b/i,
  /\bpermanent(?:ly)?\b/i,
  /\b(?:always|never)\b/i,
  /\blearn\s+(?:this|that)\b/i,
];

export function hasExplicitDurableAuthorization(text?: string | null): boolean {
  const value=(text ?? "").trim();
  return Boolean(value) && DURABLE_AUTH_PATTERNS.some((pattern)=>pattern.test(value));
}

export function requiresDurableAuthorization(input:{
  scope?: string | null;
  tier?: string | null;
  pinned?: boolean | null;
  memoryKind?: string | null;
}): boolean {
  return input.scope === "global"
    || input.tier === "core"
    || Boolean(input.pinned)
    || input.memoryKind === "correction"
    || input.memoryKind === "pattern";
}
