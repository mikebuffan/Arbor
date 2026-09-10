import {
  ArborCapabilityRegistry,
} from "./capabilities.js";
import {
  addAcousticCorrection,
  pushAnnabelleRevision,
  restoreLatestAnnabelleRevision,
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
      "Set Annabelle's current working-delta text in Arbor's control state. The previous workspace is revisioned first so the change can be restored.",
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
        reason: {
          type:
            "string",
          minLength:
            1,
          maxLength:
            500,
        },
      },
      additionalProperties:
        false,
      required: [
        "workingDelta",
        "reason",
      ],
    },
    async execute(
      args,
      context,
    ) {
      const reason =
        requireString(
          args.reason,
          "reason",
        );

      const revisioned =
        pushAnnabelleRevision(
          context.state,
          reason,
        );

      const previous =
        revisioned.annabelle
          ?.workingDelta ??
        null;

      const annabelle = {
        canon:
          revisioned.annabelle
            ?.canon ??
          [],
        lockedPassages:
          revisioned.annabelle
            ?.lockedPassages ??
          [],
        sceneState:
          revisioned.annabelle
            ?.sceneState ??
          [],
        unresolvedDecisions:
          revisioned.annabelle
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
          revisionCount:
            revisioned
              .annabelleRevisions
              ?.length ??
            0,
        },
        statePatch: {
          annabelle,
          annabelleRevisions:
            revisioned
              .annabelleRevisions,
        },
      };
    },
  });

  registry.register({
    name:
      "annabelle_restore_previous_workspace",
    description:
      "Restore Annabelle's most recent workspace revision in Arbor's control state.",
    risk:
      "reversible_write",
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
      const restored =
        restoreLatestAnnabelleRevision(
          context.state,
        );

      return {
        result: {
          restored:
            true,
          remainingRevisions:
            restored
              .annabelleRevisions
              ?.length ??
            0,
        },
        statePatch: {
          annabelle:
            restored.annabelle,
          annabelleRevisions:
            restored
              .annabelleRevisions,
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
