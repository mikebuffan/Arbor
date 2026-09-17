import type { ArborAuditSink } from "../audit.js";
import type { ArborBackendBridge } from "../backendBridge.js";
import type { ArborCapabilityRegistry } from "../capabilities.js";
import { stateScope, type ArborStateStore } from "../stateStore.js";
import { auditMoleculeRun } from "./auditAdapter.js";
import { capabilityRegistryEvidence } from "./capabilityAdapter.js";
import { applyMoleculeResultToCarrier, carrierStateToPacket } from "./carrierAdapter.js";
import { MoleculeRuntime, type FeedbackPolicy, type MoleculeRunResult } from "./molecule.js";
import { retrieveMoleculeEvidence } from "./retrievalAdapter.js";
import { selfModelObservationEvidence } from "./selfModelAdapter.js";
import { strategyEvidence } from "./strategyAdapter.js";

export type ArborMoleculeRunInput = {
  startNode: string;
  packetId: string;
  turnId: string;
  projectId?: string;
  conversationId?: string;
  authorization?: string;
  feedback?: FeedbackPolicy;
};

export class ArborMoleculeIntegration {
  constructor(
    private readonly molecule: MoleculeRuntime,
    private readonly store: ArborStateStore,
    private readonly bridge: ArborBackendBridge,
    private readonly capabilities?: ArborCapabilityRegistry,
    private readonly audit?: ArborAuditSink,
  ) {}

  async run(input: ArborMoleculeRunInput): Promise<MoleculeRunResult> {
    const scope = stateScope(input);
    const state = await this.store.load(scope);
    if (!state) throw new Error(`molecule_carrier_state_missing:${scope}`);

    const retrieval = await retrieveMoleculeEvidence(this.store, this.bridge, input);
    const packet = carrierStateToPacket(state, input.packetId, input.startNode);
    packet.evidence = [
      ...packet.evidence,
      ...retrieval.evidence,
      ...selfModelObservationEvidence(state),
      ...strategyEvidence(state),
      ...(this.capabilities ? capabilityRegistryEvidence(this.capabilities) : []),
    ];
    packet.provenance = unique([
      ...packet.provenance,
      ...retrieval.provenance,
      ...(this.capabilities ? ["arbor:capability-registry"] : []),
      ...((state.selfModelObservations?.length ?? 0) ? ["arbor:self-model-observations"] : []),
      ...((state.strategyCandidates?.length ?? 0) ? ["arbor:strategy-candidates"] : []),
    ]);
    packet.metadata = {
      ...packet.metadata,
      retrieval: {
        localMessages: retrieval.localMessages,
        externalItems: retrieval.externalItems,
      },
    };

    const run = await this.molecule.run(input.startNode, packet, input.feedback);
    const nextState = applyMoleculeResultToCarrier(state, run.result);
    await this.store.save(scope, nextState);

    if (this.audit) {
      await auditMoleculeRun({
        sink: this.audit,
        turnId: input.turnId,
        projectId: input.projectId,
        conversationId: input.conversationId,
        run,
      });
    }

    return run;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
