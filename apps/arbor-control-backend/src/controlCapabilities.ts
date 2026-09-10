import {
  ArborCapabilityRegistry,
} from "./capabilities.js";
import {
  addAcousticCorrection,
} from "./controlState.js";
import {
  stateScope,
  type ArborStateStore,
} from "./stateStore.js";

export function buildControlCapabilities(
  store: ArborStateStore,
): ArborCapabilityRegistry {
  const registry =
    new ArborCapabilityRegistry();

  registry.register({
    name: "arbor_read_control_state",
    description:
      "Read Arbor's current control-backend state for this project/conversation.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
      required: [],
    },
    async execute(_args, context) {
      const state =
        await store.load(
          stateScope(context),
        );

      return state ?? null;
    },
  });

  registry.register({
    name: "arbor_append_voice_correction",
    description:
      "Record an acoustic Voice correction only when the user explicitly supplied that correction. This changes Arbor's control state, not Mike/Nox's backend.",
    risk: "reversible_write",
    parameters: {
      type: "object",
      properties: {
        correction: {
          type: "string",
          minLength: 1,
          maxLength: 1000,
        },
      },
      additionalProperties: false,
      required: [
        "correction",
      ],
    },
    async execute(args, context) {
      const correction =
        requireString(
          args.correction,
          "correction",
        );

      const scope =
        stateScope(
          context,
        );

      const current =
        await store.load(
          scope,
        );

      if (!current) {
        throw new Error(
          "control_state_missing",
        );
      }

      const previous = [
        ...current.acousticCorrections,
      ];

      const next =
        addAcousticCorrection(
          current,
          correction,
        );

      await store.save(
        scope,
        next,
      );

      return {
        previous,
        current:
          next.acousticCorrections,
      };
    },
  });

  registry.register({
    name: "annabelle_set_working_delta",
    description:
      "Set Annabelle's current working-delta text in Arbor's own control state. Return the previous value so the change can be reversed exactly.",
    risk: "reversible_write",
    parameters: {
      type: "object",
      properties: {
        workingDelta: {
          type: [
            "string",
            "null",
          ],
        },
      },
      additionalProperties: false,
      required: [
        "workingDelta",
      ],
    },
    async execute(args, context) {
      const scope =
        stateScope(
          context,
        );

      const current =
        await store.load(
          scope,
        );

      if (!current) {
        throw new Error(
          "control_state_missing",
        );
      }

      const previous =
        current.annabelle
          ?.workingDelta ??
        null;

      const next = {
        ...current,
        annabelle: {
          canon:
            current.annabelle
              ?.canon ??
            [],
          lockedPassages:
            current.annabelle
              ?.lockedPassages ??
            [],
          sceneState:
            current.annabelle
              ?.sceneState ??
            [],
          unresolvedDecisions:
            current.annabelle
              ?.unresolvedDecisions ??
            [],
          workingDelta:
            args.workingDelta ===
              null
              ? null
              : requireString(
                  args.workingDelta,
                  "workingDelta",
                ),
        },
      };

      await store.save(
        scope,
        next,
      );

      return {
        previous,
        current:
          next.annabelle
            .workingDelta,
      };
    },
  });

  return registry;
}

function requireString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    throw new Error(
      `invalid_${field}`,
    );
  }

  return value;
}
