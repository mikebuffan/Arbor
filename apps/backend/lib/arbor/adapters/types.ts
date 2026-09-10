import type { CanonicalArborOutput } from "@/lib/arbor/runtime/arborRuntime";

export interface ArborAdapter<Result> {
  render(canonical: CanonicalArborOutput): Promise<Result>;
}
