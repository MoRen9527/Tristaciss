import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from chat_completion_service import ChatCompletionService, FeatureNotReadyError, ProviderFallbackError
from openai_ingress_models import (
    OpenAIChatCompletionsRequest,
    OpenAIChatCompletionsResponse,
    OpenAIErrorDetail,
    OpenAIErrorResponse,
    OpenAIModelsResponse,
)
from route_resolver import RouteResolutionError, RouteResolver
from providers import ProviderManager


router = APIRouter(prefix="/v1", tags=["openai-compatible"])
_chat_completion_service: Optional[ChatCompletionService] = None


def configure_openai_compatible_router(provider_manager: ProviderManager) -> None:
    global _chat_completion_service
    route_resolver = RouteResolver(provider_manager)
    _chat_completion_service = ChatCompletionService(route_resolver, provider_manager)


def get_chat_completion_service() -> ChatCompletionService:
    if _chat_completion_service is None:
        raise RuntimeError("OpenAI-compatible router has not been configured")
    return _chat_completion_service


@router.get("/models", response_model=OpenAIModelsResponse)
async def list_models():
    service = get_chat_completion_service()
    try:
        return await service.list_models()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post(
    "/chat/completions",
    response_model=OpenAIChatCompletionsResponse,
    responses={400: {"model": OpenAIErrorResponse}, 501: {"model": OpenAIErrorResponse}},
)
async def chat_completions(request: OpenAIChatCompletionsRequest):
    service = get_chat_completion_service()
    try:
        if request.stream:
            return StreamingResponse(
                _stream_chat_completions(service, request),
                media_type="text/event-stream",
            )
        return await service.create_completion(request)
    except ProviderFallbackError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RouteResolutionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FeatureNotReadyError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc


async def _stream_chat_completions(
    service: ChatCompletionService,
    request: OpenAIChatCompletionsRequest,
):
    try:
        async for chunk in service.stream_completion(request):
            yield f"data: {chunk.model_dump_json(by_alias=True, exclude_none=True)}\n\n"
        yield "data: [DONE]\n\n"
    except RouteResolutionError as exc:
        error = OpenAIErrorResponse(
            error=OpenAIErrorDetail(
                message=str(exc),
                type="route_not_found",
                param="routeMeta",
                code="tmv_route_not_found",
            )
        )
        yield f"data: {json.dumps(error.model_dump(by_alias=True, exclude_none=True), ensure_ascii=False)}\n\n"
    except FeatureNotReadyError as exc:
        error = OpenAIErrorResponse(
            error=OpenAIErrorDetail(
                message=str(exc),
                type="feature_not_ready",
                param="stream",
                code="tmv_feature_not_enabled",
            )
        )
        yield f"data: {json.dumps(error.model_dump(by_alias=True, exclude_none=True), ensure_ascii=False)}\n\n"
    except ProviderFallbackError as exc:
        error = OpenAIErrorResponse(
            error=OpenAIErrorDetail(
                message=str(exc),
                type="provider_unavailable",
                param="routeMeta",
                code="tmv_provider_unavailable",
            )
        )
        yield f"data: {json.dumps(error.model_dump(by_alias=True, exclude_none=True), ensure_ascii=False)}\n\n"