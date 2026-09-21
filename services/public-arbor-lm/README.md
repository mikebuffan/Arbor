# Private Arbor LM v0.3 alpha inference service

This is a **publicly reviewable service implementation**, not a weight repository. It starts only with an available CUDA GPU, a server-only 32+ character token, and a private mounted v0.3 LoRA adapter directory. It loads the public `Qwen/Qwen3-0.6B` base and the private adapter without retraining, merging, copying or committing the adapter. No ARK/Firefly database or Grove integration exists here.

## Interface

The backend calls `POST /generate` with server-to-server `Authorization: Bearer <ARBOR_LM_SERVICE_TOKEN>` and JSON `{ "model": "arbor-lm-v0.3", "messages": [{ "role": "user", "content": "Hello" }], "max_new_tokens": 320, "temperature": 0.5 }`. A real successful model response must be `{ "model": "arbor-lm-v0.3", "assistantText": "..." }`. All failures are non-2xx; the Next.js adapter never silently substitutes another model. A non-authenticated health check returns only readiness and model ID, not weights or prompts.

## Deployment prerequisites — not completed

1. A dedicated GPU runtime with matching CUDA PyTorch, enough GPU RAM for base and adapter, and restricted external access. Confirm v0.3 adapter provenance and private SHA-256 from the existing evaluation before mounting. Do not package or upload the private adapter to the public repository.
2. Install `requirements.txt` into that GPU image. Set `ARBOR_LM_ADAPTER_DIR` to the **private extracted adapter folder**, `ARBOR_LM_SERVICE_TOKEN` to a random server-only token (32+ chars), and optionally `ARBOR_LM_BASE_ID` / `ARBOR_LM_MODEL_ID`. This service deliberately refuses to run if CUDA, weights, or token are missing.
3. Serve with an HTTPS ingress/reverse proxy and private access controls. For local process binding behind the ingress, `uvicorn app:app --host 127.0.0.1 --port 8000`; do NOT expose plain HTTP publicly.
4. Point the **alpha** Next.js backend's `ARBOR_LM_INFERENCE_URL` at the HTTPS `/generate` URL, set `ARBOR_LM_INFERENCE_TOKEN` equal to the service token, and verify `ARBOR_LM_MODEL_ID`. No service token belongs in Flutter or GitHub.
5. Run real test turns and inspect privacy/correction/crisis behavior before inviting users. The original 24-call private eval is not a passing safety assessment. GPU hosting is a spending decision, not enabled by this PR.

## Caveats

This minimal single-process alpha runner serializes GPU calls but has no distributed queue or autoscaling. Contexts over 4096 tokens are rejected rather than silently truncated. It does not promise clinical safety, prevent model memorization of private training examples, or prove that v0.3 is suitable for general users. Prior to alpha with real user data: assess model extraction risk, consent, private training provenance, policies and retention, request timeouts, cost caps and third-party GPU data processing terms.
