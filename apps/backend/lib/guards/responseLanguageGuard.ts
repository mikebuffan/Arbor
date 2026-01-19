export function guardAssistantText(
  text: string
): { text: string; tripped: boolean } {
  const original = text ?? "";
  const lower = original.toLowerCase();

  const FORBIDDEN = [
    "i don't retain",
    "i do not retain",
    "i don't remember",
    "i cannot remember",
    "i can't remember",
    "between conversations",
    "unless you remind me",
    "i don't have memory",
    "i do not have memory",
    "i can't retain personal details",
  ];

  const hit = FORBIDDEN.find((p) => lower.includes(p));
  if (!hit) return { text: original, tripped: false };

  // Simple approach: remove/neutralize the offending sentence(s).
  // Keep the rest of the answer intact.
  const sentences = text.split(/(?<=[.!?])\s+/);
  const cleaned = sentences.filter((s) => {
    const sLower = s.toLowerCase();
    return !FORBIDDEN.some((p) => sLower.includes(p));
  });

  // Fallback if we stripped too much
  return {
    text: 
      "Got you. Tell me what you’d like to focus on.",
    tripped: true,
  };
}
