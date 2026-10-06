# Local Windows LM runtime — baseline x64/SSE2 candidate

This child stacks on PR #261 and prepares a Windows runtime that is deliberately
more conservative than the target laptop requires.

Observed target preflight on 2026-10-06:
- Windows 11 x64;
- Intel Celeron N4120, 4 cores / 4 logical processors;
- 7.82 GiB RAM;
- 16.04 GiB free system-drive storage;
- SSE2 and SSE4.2 available;
- AVX, AVX2 and AVX512F unavailable.

No machine name, device ID, serial number, product key or account identifier is
recorded in this branch.

## Why baseline SSE2 instead of SSE4.2

The target supports SSE4.2, but a baseline x86-64 build gives us a safer first
binary while avoiding accidental AVX-family requirements. Performance can be
measured later on the actual laptop before considering a more aggressive build.

The workflow pins llama.cpp commit:

5ad1c5da0ad7f6176256b823925aad19134f0263

and explicitly disables native CPU tuning, SSE4.2, AVX/AVX2/AVX512, FMA, F16C,
BMI2, OpenMP and all-variant CPU dispatch. It builds static llama-cli,
llama-server and llama-bench executables and records SHA-256 digests in
RUNTIME_MANIFEST.json.

## Important boundary

The artifact contains no model and no private Arbor adapter. A successful CI
build means only that the exact baseline binaries compile and launch on the
Windows runner.

It does not prove:
- execution on the N4120 laptop;
- acceptable generation speed;
- the Qwen3-0.6B model load;
- the Arbor LoRA conversion/load;
- the r3 signed receiver path.

Those are the next bounded stages.

## Model lane

The saved private receiver r3 still uses PyTorch/Transformers/PEFT for real
generation. Because this laptop has no AVX, that path is not assumed compatible.
The safer local experiment is:

1. baseline llama.cpp runtime;
2. exact Qwen3-0.6B GGUF;
3. privately convert the already verified Arbor v0.3 PEFT LoRA to GGUF;
4. run one local model+LoRA turn;
5. only then connect the existing signed r3 receiver contract to that local
   backend without weakening its HMAC/scope/replay boundaries.

No inference, model download, deployment or activation is performed by this
source branch.
