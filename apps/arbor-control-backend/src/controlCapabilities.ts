import {
  ArborCapabilityRegistry,
} from "./capabilities.js";
import {
  addAcousticCorrection,
} from "./controlState.js";

export function buildControlCapabilities():
  ArborCapabilityRegistry {
  const registry =
    new ArborCapabilityRegistry();

  registry.register({
    name:
      "arbor_read_control_state",
    description:
      "Read Arbor's current control-backend state for this turn.",
    risk:
      "read",
    parameters: {
      type:
        "object",
      properties: {},
      additionalProperties:
        false,
      required: [],
    },
    async execute(
      _args,
      context,
    ) {
      return {
        result:
          context.state,
      };
    },
  });

  registry.register({
    name:
      "arbor_append_voice_correction",
    description:
      "Record an acoustic Voice correction only when the user explicitly supplied it. This changes Arbor's control state only.",
    risk:
      "reversible_write",
    parameters: {
      type:
        "object",
      properties: {
        correction: {
          type:
            "string",
          minLength:
            1,
          maxLength:
            1000,
        },
      },
      additionalProperties:
        false,
      required: [
        "correction",
      ],
    },
    async execute(
      args,
      context,
    ) {
      const correction =
        requireString(
          args.correction,
          "correction",
        );

      const next =
        addAcousticCorrection(
          context.state,
          correction,
        );

      return {
        result: {
          previous:
            context.state
              .acousticCorrections,
          current:
            next.acousticCorrections,
        },
        statePatch: {
          acousticCorrections:
            next.acousticCorrections,
        },
      };
    },
  });

  registry.register({
    name:
      "annabelle_set_working_delta",
    description:
      "Set Annabelle's current working-delta text in Arbor's own control state. The previous value is returned so the change can be reversed exactly.",
    risk:
      "reversible_write",
    parameters: {
      type:
        "object",
      properties: {
        workingDelta: {
          type: [
            "string",
            "null",
          ],
        },
      },
      additionalProperties:
        false,
      required: [
        "workingDelta",
      ],
    },
    async execute(
      args,
      context,
    ) {
      const previous =
        context.state.annabelle
          ?.workingDelta ??
        null;

      const annabelle = {
        canon:
          context.state.annabelle
            ?.canon ??
          [],
        lockedPassages:
          context.state.annabelle
            ?.lockedPassages ??
          [],
        sceneState:
          context.state.annabelle
            ?.sceneState ??
          [],
        unresolvedDecisions:
          context.state.annabelle
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
      };

      return {
        result: {
          previous,
          current:
            annabelle
              .workingDelta,
        },
        statePatch: {
          annabelle,
        },
      };
    },
  });

  return registry;
}

function requireString(
  value:
    unknown,
  field:
    string,
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
