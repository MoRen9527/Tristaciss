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


class ProviderFallbackError(Exception):
    def __init__(
        self,
        message: str,
        *,
        attempted_routes: list[str],
        last_error: Optional[str] = None,
    ):
        self.attempted_routes = attempted_routes
        self.last_error = last_error

        details = message
        if attempted_routes:
            details = f"{details} Tried routes: {', '.join(attempted_routes)}"
        if last_error:
            details = f"{details}. Last error: {last_error}"

        super().__init__(details)


class ChatCompletionService:
    def __init__(self, route_resolver: RouteResolver, provider_manager: ProviderManager):
        self._route_resolver = route_resolver
        self._provider_manager = provider_manager

    async def create_completion(self, request: OpenAIChatCompletionsRequest) -> OpenAIChatCompletionsResponse:
        resolved_route = self._route_resolver.resolve_chat_completion(request)
        request_id = str(uuid.uuid4())
        content, tool_calls, usage, execution_route = await self._execute_non_stream(request, resolved_route)
        return build_completion_response(
            request_id=request_id,
            resolved_route=execution_route,
            content=content,
            usage=usage,
            tool_calls=tool_calls,
        )

    async def stream_completion(self, request: OpenAIChatCompletionsRequest) -> AsyncGenerator[OpenAIChatCompletionChunk, None]:
        resolved_route = self._route_resolver.resolve_chat_completion(request)
        request_id = str(uuid.uuid4())
        normalized_messages = self.normalize_messages(request)
        attempted_routes: list[str] = []
        last_error: Optional[str] = None

        for execution_route in self._iter_execution_routes(resolved_route):
            attempted_routes.append(self._route_label(execution_route))
            provider = self._provider_manager.get_provider(execution_route.provider)
            if not provider:
                last_error = (
                    f"No runtime provider registered for {execution_route.provider}:{execution_route.model}"
                )
                continue

            emitted_role = False
            emitted_content = False
            try:
                async for chunk in provider.chat_completion(
                    messages=normalized_messages,
                    model=execution_route.model,
                    stream=True,
                    temperature=request.temperature or 0.7,
                    max_tokens=request.max_tokens or 2000,
                    **({"tools": request.tools, "tool_choice": request.tool_choice} if request.tools else {}),
                ):
                    # ②修复：tool_calls 轮次 content 为空——守卫放宽为
                    # 有内容或有工具调用都透传
                    if chunk.content or chunk.tool_calls:
                        if not emitted_role:
                            yield self._build_role_chunk(request_id=request_id, resolved_route=execution_route)
                            emitted_role = True
                        yield OpenAIChatCompletionChunk(
                            id=request_id,
                            created=int(time.time()),
                            model=execution_route.model,
                            choices=[
                                ChunkChoice(
                                    index=0,
                                    delta=DeltaMessage(
                                        content=chunk.content or None,
                                        tool_calls=chunk.tool_calls,
                                    ),
                                    finish_reason=None,
                                )
                            ],
                            tmv=TmvRouteMeta(
                                requestId=request_id,
                                resolvedTag=execution_route.resolved_tag,
                                resolvedModelTag=execution_route.resolved_model_tag,
                                resolvedProvider=execution_route.provider,
                                resolvedModel=execution_route.model,
                                routePolicy=execution_route.route_policy,
                            ),
                        )
                        emitted_content = True

                if not emitted_role:
                    yield self._build_role_chunk(request_id=request_id, resolved_route=execution_route)

                yield OpenAIChatCompletionChunk(
                    id=request_id,
                    created=int(time.time()),
                    model=execution_route.model,
                    choices=[ChunkChoice(index=0, delta=DeltaMessage(), finish_reason="stop")],
                    tmv=TmvRouteMeta(
                        requestId=request_id,
                        resolvedTag=execution_route.resolved_tag,
                        resolvedModelTag=execution_route.resolved_model_tag,
                        resolvedProvider=execution_route.provider,
                        resolvedModel=execution_route.model,
                        routePolicy=execution_route.route_policy,
                    ),
                )
                return
            except ProviderError as exc:
                last_error = str(exc)
                if emitted_content:
                    raise ProviderFallbackError(
                        "Provider failed after streaming had already started",
                        attempted_routes=attempted_routes,
                        last_error=last_error,
                    ) from exc
                continue

        raise ProviderFallbackError(
            "No OpenAI-compatible execution route completed successfully",
            attempted_routes=attempted_routes,
            last_error=last_error,
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

        # 定案 A：provider 的 model_aliases 键（tmv-* 请求名）以别名卡片形式
        # 暴露在 /v1/models，与真实名卡片并存。
        for provider_name in self._provider_manager.provider_names:
            provider = self._provider_manager.get_provider(provider_name)
            aliases = provider.config.model_aliases if provider and provider.config else {}
            for alias_name in aliases.keys():
                key = (alias_name, provider_name)
                if key in seen:
                    continue
                seen.add(key)
                cards.append(_build_model_card(model_id=alias_name, owned_by=provider_name))

        cards.sort(key=lambda item: (item.owned_by, item.id))
        return OpenAIModelsResponse(data=cards)

    @staticmethod
    def normalize_messages(request: OpenAIChatCompletionsRequest) -> List[Dict[str, str]]:
        return [message.model_dump(exclude_none=True) for message in request.messages]

    async def _execute_non_stream(
        self,
        request: OpenAIChatCompletionsRequest,
        resolved_route: ResolvedRoute,
    ) -> tuple[str, Optional[List[Any]], Optional[Dict[str, int]], ResolvedRoute]:
        normalized_messages = self.normalize_messages(request)
        attempted_routes: list[str] = []
        last_error: Optional[str] = None

        for execution_route in self._iter_execution_routes(resolved_route):
            attempted_routes.append(self._route_label(execution_route))
            provider = self._provider_manager.get_provider(execution_route.provider)
            if not provider:
                last_error = f"No runtime provider registered for {execution_route.provider}"
                continue

            response_content = ""
            usage_info: Optional[Dict[str, int]] = None
            tool_calls: Optional[List[Any]] = None
            try:
                async for chunk in provider.chat_completion(
                    messages=normalized_messages,
                    model=execution_route.model,
                    stream=False,
                    temperature=request.temperature or 0.7,
                    max_tokens=request.max_tokens or 2000,
                    **({"tools": request.tools, "tool_choice": request.tool_choice} if request.tools else {}),
                ):
                    if chunk.content:
                        response_content += chunk.content
                    if chunk.usage:
                        usage_info = chunk.usage
                    if chunk.tool_calls:
                        tool_calls = chunk.tool_calls
            except ProviderError as exc:
                last_error = str(exc)
                if response_content:
                    raise ProviderFallbackError(
                        "Provider failed after returning a partial non-stream response",
                        attempted_routes=attempted_routes,
                        last_error=last_error,
                    ) from exc
                continue

            # ②修复：tool_calls 轮次 content 为空是正常语义——不再填桩文本
            if not response_content and not tool_calls:
                response_content = self._build_placeholder_content(request, execution_route)

            return response_content, tool_calls, usage_info, execution_route

        raise ProviderFallbackError(
            "No OpenAI-compatible execution route completed successfully",
            attempted_routes=attempted_routes,
            last_error=last_error,
        )

    @staticmethod
    def _route_label(route: ResolvedRoute) -> str:
        return f"{route.provider}:{route.model}"

    @staticmethod
    def _iter_execution_routes(resolved_route: ResolvedRoute) -> List[ResolvedRoute]:
        execution_routes: List[ResolvedRoute] = []
        seen: set[tuple[str, str]] = set()

        candidates = resolved_route.candidates or []
        for candidate in candidates:
            key = (candidate.provider, candidate.model)
            if key in seen:
                continue
            seen.add(key)
            execution_routes.append(
                ResolvedRoute(
                    provider=candidate.provider,
                    model=candidate.model,
                    route_policy=resolved_route.route_policy,
                    resolved_tag=resolved_route.resolved_tag,
                    resolved_model_tag=resolved_route.resolved_model_tag,
                    candidates=resolved_route.candidates,
                )
            )

        default_key = (resolved_route.provider, resolved_route.model)
        if default_key not in seen:
            execution_routes.append(resolved_route)

        return execution_routes

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
    tool_calls: Optional[List[Any]] = None,
) -> OpenAIChatCompletionsResponse:
    usage_stats = usage or {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    return OpenAIChatCompletionsResponse(
        id=request_id,
        created=int(time.time()),
        model=resolved_route.model,
        choices=[
            CompletionChoice(
                index=0,
                message=AssistantMessage(
                    content=content or None,
                    tool_calls=tool_calls,
                ),
                finish_reason="tool_calls" if tool_calls else "stop",
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