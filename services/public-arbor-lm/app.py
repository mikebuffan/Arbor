"""Private Arbor LM v0.3 inference gateway for a dedicated public-app alpha.

Private adapter weights are mounted into the service at runtime, never checked
into the public Arbor repository. Deploy only behind HTTPS with private server-
to-server authentication. No ability to access ARK, databases or other users.
"""
from __future__ import annotations

import asyncio
import hmac
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

MODEL_ID = os.getenv("ARBOR_LM_MODEL_ID", "arbor-lm-v0.3")
BASE_ID = os.getenv("ARBOR_LM_BASE_ID", "Qwen/Qwen3-0.6B")
ADAPTER_DIR = os.getenv("ARBOR_LM_ADAPTER_DIR", "")
SERVICE_TOKEN = os.getenv("ARBOR_LM_SERVICE_TOKEN", "")

_model = None
_tokenizer = None
_gate = asyncio.Semaphore(1)


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=6000)


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model: str
    messages: list[Message] = Field(min_length=2, max_length=22)
    max_new_tokens: int = Field(default=320, ge=1, le=512)
    temperature: float = Field(default=0.5, ge=0.0, le=1.0)


class GenerateResponse(BaseModel):
    model: str
    assistantText: str


def _load_model() -> None:
    global _model, _tokenizer
    if not SERVICE_TOKEN or len(SERVICE_TOKEN) < 32:
        raise RuntimeError("Private inference service token is missing/too short")
    directory = Path(ADAPTER_DIR)
    if not ADAPTER_DIR or not directory.is_dir():
        raise RuntimeError("Private, mounted v0.3 adapter directory not found")

    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    if not torch.cuda.is_available():
        raise RuntimeError("GPU required for hosted alpha; refusing implicit CPU inference")

    # The base model and tokenizer are public. The LoRA adapter is private.
    _tokenizer = AutoTokenizer.from_pretrained(BASE_ID)
    if _tokenizer.pad_token_id is None:
        _tokenizer.pad_token = _tokenizer.eos_token
    base = AutoModelForCausalLM.from_pretrained(
        BASE_ID, torch_dtype=torch.float16, low_cpu_mem_usage=True,
    ).to("cuda")
    _model = PeftModel.from_pretrained(base, str(directory)).eval()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _load_model()
    yield


app = FastAPI(
    title="Private Arbor LM inference gateway",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@app.get("/healthz")
def healthz():
    if _model is None:
        raise HTTPException(status_code=503, detail="model_unavailable")
    return {"ok": True, "model": MODEL_ID}


def _infer(prompt: GenerateRequest) -> str:
    import torch

    if _model is None or _tokenizer is None:
        raise HTTPException(status_code=503, detail="model_unavailable")

    formatted = _tokenizer.apply_chat_template(
        [message.model_dump() for message in prompt.messages],
        tokenize=True,
        add_generation_prompt=True,
        enable_thinking=False,
        return_tensors="pt",
    ).to("cuda")

    if formatted.shape[-1] > 4096:
        raise HTTPException(status_code=413, detail="context_too_long")

    with torch.inference_mode():
        tokens = _model.generate(
            formatted,
            max_new_tokens=prompt.max_new_tokens,
            do_sample=prompt.temperature > 0,
            **({"temperature": prompt.temperature}
               if prompt.temperature > 0 else {}),
            pad_token_id=_tokenizer.eos_token_id,
        )

    answer = _tokenizer.decode(
        tokens[0, formatted.shape[-1]:],
        skip_special_tokens=True,
    ).strip()
    if not answer:
        raise HTTPException(status_code=502, detail="empty_model_reply")
    return answer


@app.post("/generate", response_model=GenerateResponse)
async def generate(
    body: GenerateRequest,
    authorization: str = Header(default=""),
):
    if not SERVICE_TOKEN or not hmac.compare_digest(
        authorization, "Bearer " + SERVICE_TOKEN
    ):
        raise HTTPException(status_code=401, detail="unauthorized")

    if body.model != MODEL_ID:
        raise HTTPException(status_code=400, detail="wrong_model")
    if not any(message.role == "user" for message in body.messages):
        raise HTTPException(status_code=400, detail="missing_user_message")

    # The next server request waits behind the GPU-bound generation. The caller
    # enforces a separate bounded timeout; no background model execution claim.
    async with _gate:
        answer = await asyncio.to_thread(_infer, body)
    return GenerateResponse(model=MODEL_ID, assistantText=answer)
