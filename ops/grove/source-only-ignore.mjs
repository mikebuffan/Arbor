// Vercel contract: 0 skips exactly listed source branches; 1 builds all others.
const branches = new Set([
  "arbor/grove-buffalo-acceptance-20261006",
  "arbor/one-arbor-phone-reconciliation-20261006",
  "arbor/grove-lm-source-repair-20261005",
  "arbor/grove-phone-recovery-20261005",
  "arbor/grove-phone-tests-20261005",
  "arbor/grove-bounded-writes-20261006",
  "arbor/grove-buffalo-source-20261006",
  "arbor/grove-receiver-r3-20261006",
  "arbor/grove-receiver-r3-alignment-20261006",
  "arbor/grove-combined-connection-20261006",
  "arbor/grove-combined-acceptance-20261006",
  "arbor/grove-storage-release-prep-20261006",
  "arbor/grove-release-preparation-20261006"
]);
process.exitCode = branches.has(process.env.VERCEL_GIT_COMMIT_REF) ? 0 : 1;
