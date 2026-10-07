# Arbor LM v0.4 reproducibility receipt — 2026-10-06

**Candidate archive:** `arbor_model_v04_candidate_PRIVATE_20260923_013632_257640.zip`  
**Archive SHA-256:** `d47bdccb36c536550c218f01cd02b5b612e4065168592db7d9b0cda51af0ffcb`

This receipt records what is actually recoverable from the preserved candidate. It does not invent missing upstream provenance.

## Preserved training lineage

- foundation family recorded by the training notebook: `Qwen/Qwen3-0.6B`
- parent Arbor adapter archive SHA-256: `5447bc273c11374c73194428825babe22a008b0827e9ef002127a461023402aa`
- corrective dataset SHA-256: `80c206ae6cfc629f6e9d4e41e1bd18eb151ff447a6ba29a266468be07fc5ffd6`
- independent holdout SHA-256: `1d3e95787b8335bca295f2018a1dce6d289a8f6c42d4196344622adf0f32cd0c`
- training examples: 221
- steps: 112
- epochs: 2
- learning rate: 5e-5
- recorded GPU: Tesla T4
- candidate status at creation: `TRAINED_CANDIDATE_NOT_ACCEPTED`

The notebook loaded the foundation with:

`AutoModelForCausalLM.from_pretrained('Qwen/Qwen3-0.6B', ...)`

with **no explicit revision argument**. The adapter config also records `revision: null`.

Therefore the exact upstream foundation commit used during training is **not recoverable from the preserved candidate package** and must not be guessed from the current Hugging Face repository state.

## Candidate adapter payload

| File | SHA-256 |
|---|---|
| `adapter_model.safetensors` | `9e7e220569fec0c357ebd7041fe8fac3624b507e82f1f8c3037a885d82189b85` |
| `adapter_config.json` | `ac079962c8a527bd11a5e924e892a20e556f137a337fd29585cb9991c204c3bd` |

Adapter configuration records:

- base model family: `Qwen/Qwen3-0.6B`
- PEFT: LoRA
- rank: 8
- alpha: 16
- dropout: 0.05
- target modules: `q_proj`, `k_proj`, `v_proj`, `o_proj`
- PEFT version: 0.20.0
- base revision: **null**

## Embedded tokenizer payload

Unlike the foundation revision, the exact tokenizer bytes used/saved with the candidate are preserved and can be pinned directly.

| File | SHA-256 |
|---|---|
| `tokenizer.json` | `aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4` |
| `tokenizer_config.json` | `443bfa629eb16387a12edbf92a76f6a6f10b2af3b53d87ba1550adfcf45f7fa0` |
| `vocab.json` | `ca10d7e9fb3ed18575dd1e277a2579c16d108e32f27439684afa0e10b1440910` |
| `merges.txt` | `8831e4f1a044471340f7c0a83d7bd71306a5b867e95fd870f74d0c5308a904d5` |
| `special_tokens_map.json` | `76862e765266b85aa9459767e33cbaf13970f327a0e88d1c65846c2ddd3a1ecd` |
| `added_tokens.json` | `c0284b582e14987fbd3d5a2cb2bd139084371ed9acbae488829a1c900833c680` |
| `chat_template.jinja` | `a55ee1b1660128b7098723e0abcd92caa0788061051c62d51cbe87d9cf1974d8` |

The saved tokenizer reports:

- tokenizer class: `Qwen2Tokenizer`
- model max length: 131072
- EOS token: `<|im_end|>`
- PAD token: `<|endoftext|>`

The training log also records tokenizer/model special-token alignment at runtime. The existence of a tokenizer-declared 131072 maximum **does not prove the Grove/N4120 runtime can safely use that context size**.

## Generation parameters used for the v0.4 holdout

The recovered notebook used:

- `max_new_tokens=170`
- sampling enabled
- temperature 0.7
- top-p 0.8
- top-k 20
- thinking disabled in the chat template
- seeds 11 and 23

Training examples were explicitly rejected if prompt + answer exceeded 1024 tokenizer tokens.

These values describe the recovered trial; they do not automatically become the final Grove production contract.

## Target-runtime packaging path

The existing Windows/N4120 lane already selected the conservative runtime strategy:

1. pinned baseline x64/SSE2 llama.cpp;
2. exact Qwen3-0.6B **GGUF** foundation;
3. privately convert the selected PEFT LoRA to a llama.cpp-compatible LoRA/GGUF artifact;
4. verify one local foundation + LoRA generation;
5. only then connect the existing signed Grove receiver contract to that local backend.

The no-AVX runtime binary build is already proven separately. Model conversion, model load, LoRA load, output equivalence, memory use, and N4120 performance are **not** yet proven.

Do not assume the preserved PyTorch/PEFT ZIP is directly consumable by llama.cpp.

## Reproducibility status

### Pinned now

- candidate archive hash
- adapter weight hash
- adapter config hash
- exact embedded tokenizer file hashes
- dataset and holdout hashes
- recovered training hyperparameters
- recovered holdout generation parameters

### Still missing

- exact upstream Qwen foundation commit used for the historic v0.4 training run
- exact final foundation GGUF hash to be selected for Grove
- LoRA conversion tool/version and converted artifact hash
- measured tokenizer count for the full Grove runtime fixture
- target-machine RAM/latency limits
- final generation parameters after target-runtime acceptance

Because the historic foundation commit was not pinned at training time, v0.4 can be **audited and preserved** but cannot be called perfectly source-reproducible from upstream model provenance.

Any future corrective candidate must pin the foundation revision before loading it.