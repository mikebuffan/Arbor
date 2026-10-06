# Local Windows private-LM pilot preparation — 2026-10-06

Status: **source preparation only**. This child stacks on the green One Arbor ARK-spine
candidate. It does not install software, download model weights, expose a private host, activate
inference, apply grants/migrations, or change the phone.

## Goal

Prepare the smallest honest local test path for a low-end Windows x64 machine with roughly
8 GiB RAM and no assumed dedicated GPU. The target is a **bounded CPU-only pilot**, not a claim
that the machine will be fast enough for daily use.

No personal device name, serial number, Windows product identifier, account identifier or
hardware UUID is recorded in source.

## Prepared tools

### `windows-preflight.ps1`

Read-only local hardware/tool inventory. It reports:
- Windows version/build and architecture;
- CPU model/core/logical-processor counts;
- total physical RAM;
- free system-drive space;
- whether Python/py/git/node are already present.

It intentionally collects no machine name, device ID or serial number. It installs and downloads
nothing. A positive `localCpuPilotEligible` means only that a bounded attempt is worth making.

### `verify-runtime-manifest.mjs`

Fails closed unless a future private runtime manifest contains:
- exact Qwen3-0.6B foundation revision;
- exact tokenizer revision;
- the currently expected adapter SHA-256;
- the current receiver card/broker/behavior contract;
- a declared input budget large enough for the previously reviewed ~4,020-token fixture and no
  larger than the proposed 8,192-token ceiling;
- the existing 170-token response ceiling.

Passing verifies declared artifact identity/config only. It does **not** prove that weights load,
that the tokenizer actually produces the expected count, or that inference succeeds.

### `smoke-local-receiver.mjs`

One synthetic signed request to a **loopback-only HTTP receiver**. It:
- refuses remote origins;
- sends no personal archive, memory, project or conversation content;
- generates a fresh nonce and HMAC;
- performs no retries;
- expects the current adapter/receiver/behavior metadata;
- rejects fake execution receipts or claims;
- reports elapsed time and reply length without printing keys or the prompt.

This is the first real-runtime acceptance once the private receiver and artifacts are available.

## Why this does not install Qwen yet

The exact foundation revision and tokenizer revision are not yet pinned in the public source, and
the private receiver/model package is intentionally not committed. Installing “whatever is latest”
would destroy reproducibility and could leave the host/receiver contract mismatched.

The historical receiver input ceiling was 2,400 tokens while the reviewed full fixture was about
4,020. The proposed 8,192 ceiling remains **unverified** until the exact private receiver,
foundation, tokenizer and adapter are present together. Public source therefore does not simply
raise a number and call the problem solved.

## Ordered local acceptance when the machine is available

1. Run the read-only Windows preflight.
2. Confirm enough free storage; if not, STOP rather than installing into a nearly full machine.
3. Supply the exact private receiver/model artifact receipts without committing private bytes.
4. Fill a private runtime manifest with exact foundation/tokenizer commit revisions.
5. Verify the manifest.
6. Create an isolated local runtime environment.
7. Load the foundation/tokenizer/adapter locally and tokenize the reviewed fixture **before**
   changing any receiver context ceiling.
8. If tokenization/context succeeds, start the private receiver on loopback only.
9. Run one synthetic loopback smoke request and record latency/resource behavior.
10. Only if that is acceptable, run one owner-approved Grove private turn later.

A failure at any step preserves the remote/private-host option. Nothing about this pilot makes the
local laptop the required production host.

## Current boundary

Everything above can be prepared in GitHub without the owner touching the machine. The next real
gate is access to the machine plus the private receiver/model artifact receipts. No secrets or
private model files belong in this repository.
