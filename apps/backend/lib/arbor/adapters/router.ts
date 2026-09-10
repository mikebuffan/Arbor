import type { ArborChannel, ArborSubsystem } from "@/lib/arbor/runtime/arborRuntime";

export type AdapterKind = "text" | "annabelle" | "voice";

export function chooseAdapter(input: {
  channel: ArborChannel;
  subsystem: ArborSubsystem;
}): AdapterKind {
  if (input.channel === "voice") return "voice";
  if (input.subsystem === "annabelle") return "annabelle";
  return "text";
}
