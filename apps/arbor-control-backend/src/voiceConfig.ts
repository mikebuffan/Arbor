const DEFAULT_VOICES = [
  "cedar",
  "marin",
] as const;

export function allowedVoiceIds(
  configured = process.env.ARBOR_VOICE_ALLOWLIST,
): string[] {
  const parsed = (configured ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      parsed.length
        ? parsed
        : [...DEFAULT_VOICES],
    ),
  );
}

export function normalizeVoiceId(
  voiceId: string,
): string {
  const clean = voiceId.trim();

  if (!allowedVoiceIds().includes(clean)) {
    throw new Error("voice_not_allowed");
  }

  return clean;
}

export function defaultVoiceId(): string {
  const requested = process.env.ARBOR_VOICE?.trim();

  if (requested && allowedVoiceIds().includes(requested)) {
    return requested;
  }

  return allowedVoiceIds()[0];
}
