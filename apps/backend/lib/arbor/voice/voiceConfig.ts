const DEFAULT_ALLOWED_VOICES = ["cedar", "marin"] as const;

export function allowedArborVoiceIds(
  envValue = process.env.ARBOR_OPENAI_VOICE_ALLOWLIST,
): string[] {
  const configured = (envValue ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      configured.length
        ? configured
        : [...DEFAULT_ALLOWED_VOICES],
    ),
  );
}

export function assertAllowedArborVoiceId(
  voiceId: string,
  envValue = process.env.ARBOR_OPENAI_VOICE_ALLOWLIST,
): string {
  const normalized = voiceId.trim();

  if (!allowedArborVoiceIds(envValue).includes(normalized)) {
    throw new Error("arbor_voice_not_allowed");
  }

  return normalized;
}

export function defaultArborVoiceId(
  envVoice = process.env.ARBOR_OPENAI_VOICE,
  envAllowlist = process.env.ARBOR_OPENAI_VOICE_ALLOWLIST,
): string {
  const allowed = allowedArborVoiceIds(envAllowlist);
  const requested = envVoice?.trim();

  return requested && allowed.includes(requested)
    ? requested
    : allowed[0];
}
