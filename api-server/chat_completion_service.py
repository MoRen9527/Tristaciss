import time
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional

from providers import ProviderError, ProviderManager
from openai_ingress_models import (
    AssistantMessage,
    ChunkChoice,
    CompletionChoice,
    DeltaMessage,
    OpenAIChatCompletionChunk,
    OpenAIChatCompletionsRequest,
    OpenAIChatCompletionsResponse,
    OpenAIModelCard,
    OpenAIModelsResponse,
    TmvRouteMeta,
    UsageStats,
)
from route_resolver import ResolvedRoute, RouteResolver


class FeatureNotReadyError(Exception):
    pass


class ChatCompletionService:
    def __init__(self, route_resolver: RouteResolver, provider_manager: ProviderManager):
        self._route_resolver = route_resolver
        self._provider_manager = provider_manager

    async def create_completion(self, request: OpenAIChatCompletionsRequest) -> OpenAIChatCompletionsResponse:
        resolved_route = self._route_resolver.resolve_chat_completion(request)
        request_id = str(uuid.uuid4())
        content, usage = await self._execute_non_stream(request, resolved_route)
        return build_completion_response(
            request_id=request_id,
            resolved_route=resolved_route,
            content=content,
            usage=usage,
        )

    async def stream_completion(self, request: OpenAIChatCompletionsRequest) -> AsyncGenerator[OpenAIChatCompletionChunk, None]:
        resolved_route = self._route_resolver.resolve_chat_completion(request)
        request_id = str(uuid.uuid4())
        first_chunk = self._build_role_chunk(request_id=request_id, resolved_route=resolved_route)
        yield first_chunk
        provider = self._provider_manager.get_provider(resolved_route.provider)
        if not provider:
            raise FeatureNotReadyError(
                f"No runtime provider registered for {resolved_route.provider}:{resolved_route.model}"
            )

        normalized_messages = self.normalize_messages(request)
        chunk_index = 1
        async for chunk in provider.chat_completion(
            messages=normalized_messages,
            model=resolved_route.model,
            stream=True,
            temperature=request.temperature or 0.7,
            max_tokens=request.max_tokens or 2000,
        ):
            if chunk.content:
                yield OpenAIChatCompletionChunk(
                    id=request_id,
                    created=int(time.time()),
                    model=resolved_route.model,
                    choices=[
                        ChunkChoice(
                            index=0,
                            delta=DeltaMessage(content=chunk.content),
                            finish_reason=None,
                        )
                    ],
                    tmv=TmvRouteMeta(
                        requestId=request_id,
                        resolvedTag=resolved_route.resolved_tag,
                        resolvedModelTag=resolved_route.resolved_model_tag,
                        resolvedProvider=resolved_route.provider,
                        resolvedModel=resolved_route.model,
                        routePolicy=resolved_route.route_policy,
                    ),
                )
                chunk_index += 1

        yield OpenAIChatCompletionChunk(
            id=request_id,
            created=int(time.time()),
            model=resolved_route.model,
            choices=[ChunkChoice(index=0, delta=DeltaMessage(), finish_reason="stop")],
            tmv=TmvRouteMeta(
                requestId=request_id,
                resolvedTag=resolved_route.resolved_tag,
                resolvedModelTag=resolved_route.resolved_model_tag,
                resolvedProvider=resolved_route.provider,
                resolvedModel=resolved_route.model,
                routePolicy=resolved_route.route_policy,
            ),
        )

    def build_execution_plan(self, request: OpenAIChatCompletionsRequest) -> Dict[str, Any]:
        resolved_route = self._route_resolver.resolve_chat_completion(request)
        return {
            "messages": self.normalize_messages(request),
            "resolved_provider": resolved_route.provider,
            "resolved_model": resolved_route.model,
            "route_policy": resolved_route.route_policy,
            "resolved_tag": resolved_route.resolved_tag,
            "resolved_model_tag": resolved_route.resolved_model_tag,
        }

    async def list_models(self) -> OpenAIModelsResponse:
        supported_models = await self._provider_manager.get_all_supported_models()
        cards: list[OpenAIModelCard] = []
        seen: set[tuple[str, str]] = set()

        for provider_name, models in supported_models.items():
            for model in models:
                key = (model.id, provider_name)
                if key in seen:
                    continue
                seen.add(key)
                cards.append(_build_model_card(model_id=model.id, owned_by=provider_name))

        for provider_name in self._provider_manager.provider_names:
            provider = self._provider_manager.get_provider(provider_name)
            default_model = provider.config.default_model if provider else ""
            if not default_model:
                continue
            key = (default_model, provider_name)
            if key in seen:
                continue
            seen.add(key)
            cards.append(_build_model_card(model_id=default_model, owned_by=provider_name))

        cards.sort(key=lambda item: (item.owned_by, item.id))
        return OpenAIModelsResponse(data=cards)

    @staticmethod
    def normalize_messages(request: OpenAIChatCompletionsRequest) -> List[Dict[str, str]]:
        return [message.model_dump(exclude_none=True) for message in request.messages]

    async def _execute_non_stream(
        self,
        request: OpenAIChatCompletionsRequest,
        resolved_route: ResolvedRoute,
    ) -> tuple[str, Optional[Dict[str, int]]]:
        provider = self._provider_manager.get_provider(resolved_route.provider)
        if not provider:
            raise FeatureNotReadyError(f"No runtime provider registered for {resolved_route.provider}")

        response_content = ""
        usage_info: Optional[Dict[str, int]] = None
        normalized_messages = self.normalize_messages(request)

        try:
            async for chunk in provider.chat_completion(
                messages=normalized_messages,
                model=resolved_route.model,
                stream=False,
                temperature=request.temperature or 0.7,
                max_tokens=request.max_tokens or 2000,
            ):
                if chunk.content:
                    response_content += chunk.content
                if chunk.usage:
                    usage_info = chunk.usage
        except ProviderError as exc:
            raise RuntimeError(str(exc)) from exc

        if not response_content:
            response_content = self._build_placeholder_content(request, resolved_route)

        return response_content, usage_info

    @staticmethod
    def _build_placeholder_content(
        request: OpenAIChatCompletionsRequest,
        resolved_route: ResolvedRoute,
    ) -> str:
        user_messages = [message.content for message in request.messages if message.role == "user"]
        last_user_message = user_messages[-1] if user_messages else "<empty>"
        preview = last_user_message if len(last_user_message) <= 120 else f"{last_user_message[:117]}..."
        return (
            "Phase C non-stream scaffold completed route resolution successfully. "
            f"Resolved provider={resolved_route.provider}, model={resolved_route.model}, "
            f"policy={resolved_route.route_policy}. "
            f"Last user message preview: {preview}"
        )

    @staticmethod
    def _build_role_chunk(request_id: str, resolved_route: ResolvedRoute) -> OpenAIChatCompletionChunk:
        return OpenAIChatCompletionChunk(
            id=request_id,
            created=int(time.time()),
            model=resolved_route.model,
            choices=[
                ChunkChoice(
                    index=0,
                    delta=DeltaMessage(role="assistant"),
                    finish_reason=None,
                )
            ],
            tmv=TmvRouteMeta(
                requestId=request_id,
                resolvedTag=resolved_route.resolved_tag,
                resolvedModelTag=resolved_route.resolved_model_tag,
                resolvedProvider=resolved_route.provider,
                resolvedModel=resolved_route.model,
                routePolicy=resolved_route.route_policy,
            ),
        )


def build_completion_response(
    request_id: str,
    resolved_route: ResolvedRoute,
    content: str,
    usage: Optional[Dict[str, int]] = None,
) -> OpenAIChatCompletionsResponse:
    usage_stats = usage or {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    return OpenAIChatCompletionsResponse(
        id=request_id,
        created=int(time.time()),
        model=resolved_route.model,
        choices=[
            CompletionChoice(
                index=0,
                message=AssistantMessage(content=content),
                finish_reason="stop",
            )
        ],
        usage=UsageStats(**usage_stats),
        tmv=TmvRouteMeta(
            requestId=request_id,
            resolvedTag=resolved_route.resolved_tag,
            resolvedModelTag=resolved_route.resolved_model_tag,
            resolvedProvider=resolved_route.provider,
            resolvedModel=resolved_route.model,
            routePolicy=resolved_route.route_policy,
        ),
    )


def _build_model_card(*, model_id: str, owned_by: str) -> OpenAIModelCard:
    return OpenAIModelCard(id=model_id, owned_by=owned_by)