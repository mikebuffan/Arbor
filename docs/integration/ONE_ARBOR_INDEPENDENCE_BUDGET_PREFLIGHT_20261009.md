# One Arbor — independence acceptance-run size preflight

Source-only child of exact green PR #386 `5ef933b5a4cbc83884f47d5eee4dc83d505efe6a`. No ARK task or model/deployment execution.

## Source-level blocker removed
`runAcceptanceComparison` already required positive numeric `maxCalls` and `maxOutputTokens` but had no practical upper bound on either, nor on count/size of externally supplied case packs. A trusted-host integration using an oversized, mistaken configuration could attempt extreme provider usage or expensive hashing before its numeric request counter stopped execution.

The existing validator now rejects, **before hashing, recording, fixture provisioning, or inference**, a case pack with more than 48 cases; more than 8 user turns per case; turns longer than 12,000 characters; or case IDs longer than 128 characters. Maximum `maxCalls` is 128, maximum `maxOutputTokens` 4,096, and their product may not exceed 150,000 declared *output-token slots*. Existing valid 16/18/12-case tests and intended calls remain possible.

New synthetic negatives explicitly prove every bad budget and case-pack shape is rejected before callbacks. No pricing data, currency conversion, actual model request, grading or user data involved. These size ceilings **are not a dollar cost cap**: input tokens, model prices, retries, hosted permissions and any external execution must separately be constrained and owner-approved before a paid experiment. The current #386 source has no matching READY non-production deployment; do not claim a live model test.

Run exact-head independent source/15-lane/Grove CI, verify git pins and preserve owner branches. Source acceptance does not prove genuine independent judgment.

## Aggregate input ceiling

Individual per-turn/case limits did not bound their combined size: a 48×8 pack with 12,000 characters per turn could still produce millions of characters of input. The runner now also rejects total combined case-turn contents above 120,000 characters **before hashing** and total task/baseline/candidate instruction/context text above 64,000 characters. Two new offline tests assert both limits fail without recording, provisioning or calling a provider. These are still not model pricing/currency controls.
