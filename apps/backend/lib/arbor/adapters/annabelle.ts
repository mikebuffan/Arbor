import type { ArborAdapter } from "./types";
import type { CanonicalArborOutput } from "@/lib/arbor/runtime/arborRuntime";

export type AnnabelleRenderedOutput = {
  type: "annabelle";
  text: string;
  turnId: string;
};

export class AnnabelleAdapter implements ArborAdapter<AnnabelleRenderedOutput> {
  async render(canonical: CanonicalArborOutput): Promise<AnnabelleRenderedOutput> {
    if (canonical.activeSubsystem !== "annabelle") {
      throw new Error("annabelle_adapter_used_outside_annabelle");
    }

    return {
      type: "annabelle",
      text: canonical.text,
      turnId: canonical.turnId,
    };
  }
}
