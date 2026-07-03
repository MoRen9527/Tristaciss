from __future__ import annotations

import time

import pytest

from legacy_chat_stream_adapter import LegacyChatStreamAdapter
from openai_ingress_models import LegacyChatStreamRequest, OpenAIChatCompletionChunk, ChunkChoice, DeltaMessage


class _FakeChatCompletionService:
    def __init__(self, *, chunks: list[OpenAIChatCompletionChunk] | None = None, error: Exception | None = None):
        self._chunks = chunks or []
        self._error = error
        self.requests = []

    async def stream_completion(self, request):
        self.requests.append(request)
        if self._error is not None:
            raise self._error
        for chunk in self._chunks:
            yield chunk


def _build_chunk(content: str | None) -> OpenAIChatCompletionChunk:
    return OpenAIChatCompletionChunk(
        id="req-legacy-1",
        created=int(time.time()),
        model="glm-4.5",
        choices=[
            ChunkChoice(
                index=0,
                delta=DeltaMessage(content=content),
                finish_reason=None,
            )
        ],
    )


def test_translate_request_maps_provider_and_model_to_openai_request():
    adapter = LegacyChatStreamAdapter(_FakeChatCompletionService())

    translated = adapter.translate_request(
        LegacyChatStreamRequest(
            query="继续生成代码",
            provider="glm",
            model="glm-4.5",
            chat_mode="single",
        )
    )

    assert translated.stream is True
    assert translated.model == "glm-4.5"
    assert translated.route_meta is not None
    assert translated.route_meta.provider == "glm"
    assert translated.route_meta.model == "glm-4.5"


def test_translate_request_omits_auto_provider_override():
    adapter = LegacyChatStreamAdapter(_FakeChatCompletionService())

    translated = adapter.translate_request(
        LegacyChatStreamRequest(
            query="继续生成代码",
            provider="auto",
            model="glm-4.5",
            chat_mode="single",
        )
    )

    assert translated.model == "glm-4.5"
    assert translated.route_meta is None


def test_translate_request_rejects_group_chat_mode():
    adapter = LegacyChatStreamAdapter(_FakeChatCompletionService())

    with pytest.raises(ValueError, match="Legacy adapter only supports single chat migration scaffolding"):
        adapter.translate_request(
            LegacyChatStreamRequest(
                query="继续生成代码",
                provider="glm",
                model="glm-4.5",
                chat_mode="group",
            )
        )


@pytest.mark.asyncio
async def test_stream_legacy_events_emits_start_content_end_sequence():
    service = _FakeChatCompletionService(chunks=[_build_chunk("legacy content")])
    adapter = LegacyChatStreamAdapter(service)

    events = [
        event
        async for event in adapter.stream_legacy_events(
            LegacyChatStreamRequest(query="继续生成代码", provider="glm", model="glm-4.5")
        )
    ]

    assert [event.type for event in events] == ["start", "content", "end"]
    assert events[1].content == "legacy content"
    assert len(service.requests) == 1
    assert service.requests[0].route_meta is not None
    assert service.requests[0].route_meta.provider == "glm"


@pytest.mark.asyncio
async def test_stream_legacy_events_emits_error_event_when_service_fails():
    adapter = LegacyChatStreamAdapter(_FakeChatCompletionService(error=RuntimeError("route failed")))

    events = [
        event
        async for event in adapter.stream_legacy_events(
            LegacyChatStreamRequest(query="继续生成代码", provider="glm")
        )
    ]

    assert [event.type for event in events] == ["start", "error"]
    assert events[1].error == "route failed"