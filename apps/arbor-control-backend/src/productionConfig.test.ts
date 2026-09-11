import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assertProductionPersistenceConfigured,
  productionPersistenceStatus,
} from "./productionConfig.js";

describe(
  "production persistence configuration",
  () => {
    it(
      "allows development defaults",
      () => {
        expect(
          productionPersistenceStatus({
            NODE_ENV:
              "test",
          })
            .durableConfigurationReady,
        ).toBe(
          true,
        );
      },
    );

    it(
      "requires explicit absolute durable paths in production",
      () => {
        expect(
          () =>
            assertProductionPersistenceConfigured({
              NODE_ENV:
                "production",
            }),
        ).toThrow(
          "production_state_file_required",
        );

        expect(
          () =>
            assertProductionPersistenceConfigured({
              NODE_ENV:
                "production",
              ARBOR_STATE_FILE:
                "./state.json",
              ARBOR_AUDIT_FILE:
                "/data/audit.jsonl",
            }),
        ).toThrow(
          "production_state_file_must_be_absolute",
        );

        expect(
          () =>
            assertProductionPersistenceConfigured({
              NODE_ENV:
                "production",
              ARBOR_STATE_FILE:
                "/data/state.json",
              ARBOR_AUDIT_FILE:
                "/data/audit.jsonl",
            }),
        ).not.toThrow();
      },
    );
  },
);
