import {
  ensureSelfModelIdentity,
} from "./selfModelState.js";
import {
  addSelfModelObservation,
  summarizeSelfModelObservations,
  type SelfModelObservationInput,
} from "./selfModelObservations.js";
import {
  applySelfModelMigration,
  previewSelfModelMigration,
} from "./selfModelMigration.js";
import {
  createTransplantBundle,
  restoreTransplantSnapshot,
  type ArborTransplantBundle,
} from "./transplant.js";
import {
  stateScope,
  type ArborStateStore,
} from "./stateStore.js";

export class SelfModelControlService {
  constructor(
    private readonly store:
      ArborStateStore,
  ) {}

  async recordObservation(
    input: {
      projectId?: string;
      conversationId?: string;
      observation: SelfModelObservationInput;
    },
  ) {
    const scope =
      stateScope(
        input,
      );

    return this.store.mutate(
      scope,
      (
        current,
      ) => {
        if (!current) {
          throw new Error(
            "control_state_missing",
          );
        }

        const verified =
          ensureSelfModelIdentity(
            current,
          );

        const next =
          addSelfModelObservation(
            verified,
            input.observation,
          );

        return {
          state:
            next,

          result: {
            observations:
              summarizeSelfModelObservations(
                next,
              ),
          },
        };
      },
    );
  }

  async previewMigration(
    input: {
      projectId?: string;
      conversationId?: string;
    },
  ) {
    const scope =
      stateScope(
        input,
      );

    const state =
      await this.store.load(
        scope,
      );

    if (!state) {
      throw new Error(
        "control_state_missing",
      );
    }

    return previewSelfModelMigration(
      state,
    );
  }

  async applyMigration(
    input: {
      projectId?: string;
      conversationId?: string;
      expectedCurrentChecksum: string;
      reason: string;
    },
  ) {
    const scope =
      stateScope(
        input,
      );

    return this.store.mutate(
      scope,
      (
        current,
      ) => {
        if (!current) {
          throw new Error(
            "control_state_missing",
          );
        }

        const next =
          applySelfModelMigration(
            current,
            {
              expectedCurrentChecksum:
                input
                  .expectedCurrentChecksum,

              reason:
                input.reason,
            },
          );

        return {
          state:
            next,

          result: {
            selfModel:
              next.selfModel,

            migration:
              next
                .selfModelMigrations
                ?.at(
                  -1,
                ),
          },
        };
      },
    );
  }

  async exportTransplant(
    input: {
      projectId?: string;
      conversationId?: string;
    },
  ):
    Promise<
      ArborTransplantBundle
    > {
    const scope =
      stateScope(
        input,
      );

    const snapshot =
      await this.store
        .exportScope(
          scope,
        );

    return createTransplantBundle(
      snapshot,
    );
  }

  async importTransplant(
    bundle:
      ArborTransplantBundle,
  ): Promise<void> {
    const snapshot =
      restoreTransplantSnapshot(
        bundle,
      );

    await this.store
      .importScope(
        snapshot,
      );
  }
}
