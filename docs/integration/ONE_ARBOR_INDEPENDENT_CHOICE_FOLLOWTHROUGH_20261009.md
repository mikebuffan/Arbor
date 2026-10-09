# One Arbor — independent choice + follow-through review

Review-only continuation of the independence lane. This is **not an ARK task**, deployment, new worker, or model-evaluation outcome.

Sources:
- PR #379 exact parent `d9dab125424b6e627f93461dd4e13b252e3af65d`: single-prompt, multi-step follow-through with already-done/blocked-task safety, three synthetic tests, green CI.
- PR #378 exact source `b68e1307e88dc033ef3ee68de894e168cb2c5c71`: recognises bounded user delegation (“Whichever you want”, “Which ever you want”, “Your choice”) as continuation **only if a real unfinished goal exists**; preserves authority block and STOP. Green CI.
- This child does not change either source owner branch.

Integrate the **two exact Git blobs** for existing `longitudinalPolicy.ts` and existing `longitudinalShorthand.integration.test.ts` from #378 onto #379 without importing unrelated host/ARK changes. Independent follow-through synthetic test stays unchanged. Union existing source-only Vercel ignore branches, preserve existing source-fingerprint script, pin the source files, and extend the existing independent CI focused suite.

Acceptance boundaries: source-only CI and TypeScript must pass at the exact child head. The combined source demonstrates the *coded* workflow correctly interprets delegated-choice shorthand, while the synthetic agent loop can complete reversible work without repeated user prompting. **No real-model choice quality, fresh blind holdout, or autonomous background execution is proven.** No paid inference, permission change, private records, release, or ARK runtime work.
