from typing import AsyncGenerator, Dict

from chat_completion_service import ChatCompletionService
from openai_ingress_models import (
    LegacyChatStreamRequest,
    LegacySseEvent,
    OpenAIChatCompletionsRequest,
    OpenAIChatMessage,
    RouteMeta,
)


class LegacyChatStreamAdapter:
    def __init__(self, chat_completion_service: ChatCompletionService):
        self._chat_completion_service = chat_completion_service

    def translate_request(self, request: LegacyChatStreamRequest) -> OpenAIChatCompletionsRequest:
        if request.chat_mode != "single":
            raise ValueError("Legacy adapter only supports single chat migration scaffolding")

        route_meta = None
        route_meta_payload = {}
        if request.provider and request.provider != "auto":
            route_meta_payload["provider"] = request.provider
        if request.model:
            if route_meta_payload:
                route_meta_payload["model"] = request.model

        if route_meta_payload:
            route_meta = RouteMeta(**route_meta_payload)

        return OpenAIChatCompletionsRequest(
            messages=[OpenAIChatMessage(role="user", content=request.query)],
            model=request.model or "auto",
            stream=True,
            routeMeta=route_meta,
        )

    async def stream_legacy_events(
        self,
        request: LegacyChatStreamRequest,
    ) -> AsyncGenerator[LegacySseEvent, None]:
        yield LegacySseEvent(type="start")
        try:
            translated_request = self.translate_request(request)
            async for chunk in self._chat_completion_service.stream_completion(translated_request):
                choice = chunk.choices[0] if chunk.choices else None
                content = choice.delta.content if choice and choice.delta else None
                if content:
                    yield LegacySseEvent(type="content", content=content)
            yield LegacySseEvent(type="end")
        except Exception as exc:
            yield LegacySseEvent(type="error", error=str(exc))


def legacy_event_to_sse(event: LegacySseEvent) -> str:
    payload: Dict[str, str] = {"type": event.type}
    if event.content is not None:
        payload["content"] = event.content
    if event.error is not None:
        payload["error"] = event.error
    import json

    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"