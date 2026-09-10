import type { ArborAdapter } from "./types";
import type { CanonicalArborOutput } from "@/lib/arbor/runtime/arborRuntime";

export class TextAdapter implements ArborAdapter<CanonicalArborOutput> {
  async render(canonical: CanonicalArborOutput): Promise<CanonicalArborOutput> {
    return canonical;
  }
}
