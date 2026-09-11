import {
  ArborCapabilityRegistry,
} from "./capabilities.js";
import {
  addAcousticCorrection,
  pushAnnabelleRevision,
  restoreLatestAnnabelleRevision,
} from "./controlState.js";
import {
  addSelfModelObservation,
} from "./selfModelObservations.js";

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
      "arbor_record_self_model_observation",
    description:
      "Record concrete, inspectable behavioral evidence about Arbor's self-model. Use only evidence actually demonstrated in the current interaction or verified action result. Never record a desired trait, prompt instruction, or self-description as evidence by itself.",
    risk:
      "reversible_write",
    parameters: {
      type:
        "object",
      properties: {
        targetKind: {
          type:
            "string",
          enum: [
            "pattern",
            "family",
          ],
        },
        targetId: {
          type:
            "string",
          minLength:
            1,
          maxLength:
            200,
        },
        domain: {
          type:
            "string",
          minLength:
            1,
          maxLength:
            100,
        },
        verdict: {
          type:
            "string",
          enum: [
            "supports",
            "contradicts",
          ],
        },
        evidence: {
          type:
            "string",
          minLength:
            1,
          maxLength:
            2000,
        },
        confidence: {
          type:
            "number",
          minimum:
            0,
          maximum:
            1,
        },
      },
      additionalProperties:
        false,
      required: [
        "targetKind",
        "targetId",
        "domain",
        "verdict",
        "evidence",
        "confidence",
      ],
    },
    async execute(
      args,
      context,
    ) {
      const targetKind =
        requireEnum(
          args.targetKind,
          [
            "pattern",
            "family",
          ] as const,
          "targetKind",
        );

      const verdict =
        requireEnum(
          args.verdict,
          [
            "supports",
            "contradicts",
          ] as const,
          "verdict",
        );

      const targetId =
        requireString(
          args.targetId,
          "targetId",
        );

      const domain =
        requireString(
          args.domain,
          "domain",
        );

      const evidence =
        requireString(
          args.evidence,
          "evidence",
        );

      const confidence =
        requireNumber(
          args.confidence,
          "confidence",
        );

      const next =
        addSelfModelObservation(
          context.state,
          {
            targetKind,
            targetId,
            domain,
            verdict,
            evidence,
            confidence,
            sourceTurnId:
              context.turnId,
          },
        );

      return {
        result: {
          recorded:
            (next
              .selfModelObservations
              ?.length ??
            0) >
            (context.state
              .selfModelObservations
              ?.length ??
            0),
        },
        statePatch: {
          selfModelObservations:
            next
              .selfModelObservations,
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

function requireNumber(
  value:
    unknown,
  field:
    string,
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `invalid_${field}`,
    );
  }

  return value;
}

function requireEnum<
  const T extends
    readonly string[],
>(
  value:
    unknown,
  allowed:
    T,
  field:
    string,
):
  T[number] {
  if (
    typeof value !==
      "string" ||
    !allowed.some(
      (item) =>
        item ===
        value,
    )
  ) {
    throw new Error(
      `invalid_${field}`,
    );
  }

  return value as
    T[number];
}
