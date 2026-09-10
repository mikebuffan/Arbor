import type { ArborSubsystem } from "@/lib/arbor/runtime/arborRuntime";

const ANNABELLE_CUE = "annabelle, kitchen's yours";
const ARBOR_CUE = "arbor, kitchen's yours";

function normalizeCue(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .toLowerCase();
}

export function resolveSubsystemCue(userText: string): ArborSubsystem | null {
  const normalized = normalizeCue(userText);
  if (normalized === ANNABELLE_CUE) return "annabelle";
  if (normalized === ARBOR_CUE) return "arbor";
  return null;
}
