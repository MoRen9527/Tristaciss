from __future__ import annotations

from dataclasses import dataclass

import pytest

from chat_completion_service import ChatCompletionService
from openai_ingress_models import OpenAIChatCompletionsRequest
from providers.base import ModelInfo, ProviderConfig, ProviderType, StreamChunk
from route_resolver import RouteResolver


@dataclass
class _FakeProvider:
    config: ProviderConfig
    supported_models: list[ModelInfo]
    non_stream_chunks: list[StreamChunk]

    async def chat_completion(self, **_: object):
        for chunk in self.non_stream_chunks:
            yield chunk

    async def get_supported_models(self) -> list[ModelInfo]:
        return list(self.supported_models)


class _FakeProviderManager:
    def __init__(self, providers: dict[str, _FakeProvider], default_provider_name: str):
        self._providers = providers
        self._default_provider_name = default_provider_name

    def get_provider(self, name: str):
        return self._providers.get(name)

    @property
    def provider_names(self) -> list[str]:
        return list(self._providers.keys())

    @property
    def default_provider_name(self) -> str:
        return self._default_provider_name

    async def get_all_supported_models(self) -> dict[str, list[ModelInfo]]:
        return {
            provider_name: await provider.get_supported_models()
            for provider_name, provider in self._providers.items()
        }


def _build_provider(
    *,
    provider_type: ProviderType,
    default_model: str,
    supported_models: list[ModelInfo],
    content: str = "hello from provider",
) -> _FakeProvider:
    return _FakeProvider(
        config=ProviderConfig(
            provider_type=provider_type,
            api_key="test-key",
            base_url="https://example.invalid/v1",
            default_model=default_model,
        ),
        supported_models=supported_models,
        non_stream_chunks=[
            StreamChunk(
                content=content,
                chunk_id=1,
                request_id="req-1",
                timestamp=0.0,
                model=default_model,
                provider=provider_type.value,
                usage={"prompt_tokens": 3, "completion_tokens": 5, "total_tokens": 8},
            )
        ],
    )


@pytest.mark.asyncio
async def test_list_models_includes_supported_and_default_fallback_models():
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
    manager = _FakeProviderManager(
        {
            "glm": _build_provider(
                provider_type=ProviderType.GLM,
                default_model="glm-4.5",
                supported_models=[glm_model],
            ),
            "deepseek": _build_provider(
                provider_type=ProviderType.OPENAI,
                default_model="deepseek-chat",
                supported_models=[],
            ),
        },
        default_provider_name="glm",
    )
    service = ChatCompletionService(RouteResolver(manager), manager)

    response = await service.list_models()

    assert response.object == "list"
    assert [(item.id, item.owned_by) for item in response.data] == [
        ("deepseek-chat", "deepseek"),
        ("glm-4.5", "glm"),
    ]


@pytest.mark.asyncio
async def test_create_completion_uses_provider_content_and_usage():
    manager = _FakeProviderManager(
        {
            "glm": _build_provider(
                provider_type=ProviderType.GLM,
                default_model="glm-4.5",
                supported_models=[],
                content="implemented response",
            )
        },
        default_provider_name="glm",
    )
    service = ChatCompletionService(RouteResolver(manager), manager)
    request = OpenAIChatCompletionsRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "写一个 hello world"}],
            "workspace": {"language": "python"},
        }
    )

    response = await service.create_completion(request)

    assert response.model == "glm-4.5"
    assert response.choices[0].message.content == "implemented response"
    assert response.usage.prompt_tokens == 3
    assert response.usage.completion_tokens == 5
    assert response.usage.total_tokens == 8
