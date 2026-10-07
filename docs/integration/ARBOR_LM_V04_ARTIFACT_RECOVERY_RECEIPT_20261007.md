# Arbor LM v0.4 private artifact recovery receipt — 2026-10-07

Status: **artifact recovered and hash-verified; candidate remains NOT ACCEPTED**.

No training, inference, deployment, paid compute, model upload, or promotion occurred in this recovery pass.

## Candidate archive

- archive filename: `arbor_model_v04_candidate_PRIVATE_20260923_013632_257640.zip`
- archive SHA-256: `d47bdccb36c536550c218f01cd02b5b612e4065168592db7d9b0cda51af0ffcb`
- ZIP entries: 11
- embedded status: `TRAINED_CANDIDATE_NOT_ACCEPTED`
- foundation family: `Qwen/Qwen3-0.6B`
- foundation revision in adapter config: `null`
- parent adapter SHA-256: `5447bc273c11374c73194428825babe22a008b0827e9ef002127a461023402aa`
- embedded training receipt: 221 examples / 112 steps / 2 epochs / learning rate 5e-05 / Tesla T4 / 297.3 seconds

The historical exact foundation commit remains unrecoverable from this artifact and must not be guessed.

## Exact recovered payload identities

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| adapter_model.safetensors | 9,204,512 | `9e7e220569fec0c357ebd7041fe8fac3624b507e82f1f8c3037a885d82189b85` |
| adapter_config.json | 1,098 | `ac079962c8a527bd11a5e924e892a20e556f137a337fd29585cb9991c204c3bd` |
| tokenizer.json | 11,422,654 | `aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4` |
| tokenizer_config.json | 5,404 | `443bfa629eb16387a12edbf92a76f6a6f10b2af3b53d87ba1550adfcf45f7fa0` |
| vocab.json | 2,776,833 | `ca10d7e9fb3ed18575dd1e277a2579c16d108e32f27439684afa0e10b1440910` |
| merges.txt | 1,671,853 | `8831e4f1a044471340f7c0a83d7bd71306a5b867e95fd870f74d0c5308a904d5` |
| special_tokens_map.json | 613 | `76862e765266b85aa9459767e33cbaf13970f327a0e88d1c65846c2ddd3a1ecd` |
| added_tokens.json | 707 | `c0284b582e14987fbd3d5a2cb2bd139084371ed9acbae488829a1c900833c680` |
| chat_template.jinja | 4,168 | `a55ee1b1660128b7098723e0abcd92caa0788061051c62d51cbe87d9cf1974d8` |
| ARBOR_V04_CANDIDATE_RECEIPT.json | 598 | `c667d071e3c33bfe98f8b47ebbf954f635545f27982c787d933001ca1fffcf35` |

The preserved tokenizer bytes can therefore be pinned exactly for compatibility checks even though the historical upstream foundation revision is missing.

## Remaining protected gates

1. deliberately choose and record an exact compatible Qwen foundation revision for the next experiment;
2. load this exact adapter + preserved tokenizer against that foundation and detect baseline drift before training;
3. use the prepared targeted corrective dataset and untouched holdout;
4. write/hash any new candidate bits before naming a new model version;
5. require zero high-severity source/tool/action-honesty failures;
6. separately select and pin target GGUF/runtime and measure RAM/latency/context;
7. keep Grove model-turn activation OFF until receiver/runtime acceptance passes.

Do not publish private model/training artifacts merely because their hashes are recorded here.
