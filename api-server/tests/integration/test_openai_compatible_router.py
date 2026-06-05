from __future__ import annotations

import json
from dataclasses import dataclass

from fastapi import FastAPI
from fastapi.testclient import TestClient

from openai_compatible_api import configure_openai_compatible_router, router
from providers.base import ModelInfo, ProviderConfig, ProviderType, StreamChunk


@dataclass
class _FakeProvider:
    config: ProviderConfig
    supported_models: list[ModelInfo]

    async def chat_completion(self, *, stream: bool = True, model: str, **_: object):
        if stream:
            yield StreamChunk(
                content="hello",
                chunk_id=1,
                request_id="req-stream",
                timestamp=0.0,
                model=model,
                provider=self.config.provider_type.value,
            )
            yield StreamChunk(
                content=" world",
                chunk_id=2,
                request_id="req-stream",
                timestamp=0.0,
                model=model,
                provider=self.config.provider_type.value,
            )
            return

        yield StreamChunk(
            content="hello world",
            chunk_id=1,
            request_id="req-sync",
            timestamp=0.0,
            model=model,
            provider=self.config.provider_type.value,
            usage={"prompt_tokens": 2, "completion_tokens": 2, "total_tokens": 4},
        )

    async def get_supported_models(self) -> list[ModelInfo]:
        return list(self.supported_models)


class _FakeProviderManager:
    def __init__(self):
        glm_model = ModelInfo(
            id="glm-4.5",
            name="GLM-4.5",
            provider="glm",
            max_context_length=128000,
            max_input_tokens=120000,
            max_output_tokens=4096,
            input_price_per_1k=0.001,
            output_price_per_1k=0.001,
            supports_streaming=True,
        )
        self._providers = {
            "glm": _FakeProvider(
                config=ProviderConfig(
                    provider_type=ProviderType.GLM,
                    api_key="test-key",
                    base_url="https://example.invalid/v1",
                    default_model="glm-4.5",
                ),
                supported_models=[glm_model],
            )
        }

    def get_provider(self, name: str):
        return self._providers.get(name)

    @property
    def provider_names(self) -> list[str]:
        return list(self._providers.keys())

    @property
    def default_provider_name(self) -> str:
        return "glm"

    async def get_all_supported_models(self) -> dict[str, list[ModelInfo]]:
        return {
            provider_name: await provider.get_supported_models()
            for provider_name, provider in self._providers.items()
        }


def _build_client() -> TestClient:
    app = FastAPI()
    configure_openai_compatible_router(_FakeProviderManager())
    app.include_router(router)
    return TestClient(app)


def test_list_models_returns_openai_compatible_list():
    client = _build_client()

    response = client.get("/v1/models")

    assert response.status_code == 200
    body = response.json()
    assert body["object"] == "list"
    assert body["data"] == [
        {
            "id": "glm-4.5",
            "object": "model",
            "created": 0,
            "owned_by": "glm",
            "permission": [],
        }
    ]


def test_chat_completions_returns_non_stream_response():
    client = _build_client()

    response = client.post(
        "/v1/chat/completions",
        json={
            "messages": [{"role": "user", "content": "hello"}],
            "workspace": {"language": "python"},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["object"] == "chat.completion"
    assert body["model"] == "glm-4.5"
    assert body["choices"][0]["message"]["content"] == "hello world"
    assert body["usage"] == {
        "prompt_tokens": 2,
        "completion_tokens": 2,
        "total_tokens": 4,
    }


def test_chat_completions_stream_returns_sse_chunks_and_done_marker():
    client = _build_client()

    with client.stream(
        "POST",
        "/v1/chat/completions",
        json={
            "messages": [{"role": "user", "content": "hello"}],
            "workspace": {"language": "python"},
            "stream": True,
        },
    ) as response:
        payload_lines = [line for line in response.iter_lines() if line]

    assert response.status_code == 200
    assert payload_lines[-1] == "data: [DONE]"

    first_chunk = json.loads(payload_lines[0].removeprefix("data: "))
    second_chunk = json.loads(payload_lines[1].removeprefix("data: "))
    third_chunk = json.loads(payload_lines[2].removeprefix("data: "))
    final_chunk = json.loads(payload_lines[3].removeprefix("data: "))

    assert first_chunk["choices"][0]["delta"] == {"role": "assistant"}
    assert second_chunk["choices"][0]["delta"]["content"] == "hello"
    assert third_chunk["choices"][0]["delta"]["content"] == " world"
    assert final_chunk["choices"][0]["finish_reason"] == "stop"
