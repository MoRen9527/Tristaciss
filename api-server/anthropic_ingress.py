"""Anthropic Messages API compatible ingress (POST /v1/messages).

A' (2026-08-13, CTO 小狄裁定): TriStaciss Anthropic-compatible ingress for
Anthropic-API consumers (TriModel TrimetaverseProvider / Claude Code CLI).

Translates Anthropic Messages API requests into the existing
ChatCompletionService pipeline (route_resolver tmv-* alias mapping applies
automatically — no second mapping layer) and reformats responses back into
Anthropic-compatible shape.

Auth: intentionally mirrors the current /v1/chat/completions ingress
(no per-request auth dependency) — consistent face with the OpenAI ingress;
credit-ledger wiring is deferred (O-TS-1 half-finished work is reference-only).

Streaming SSE format: event: <type>\\ndata: <json>\\n\\n
"""

import json
import time
import uuid
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator

from chat_completion_service import ChatCompletionService, FeatureNotReadyError, ProviderFallbackError
from openai_ingress_models import OpenAIChatCompletionsRequest, OpenAIChatMessage, RouteMeta
from route_resolver import RouteResolutionError, RouteResolver
from providers import ProviderManager

router = APIRouter(prefix="/v1", tags=["anthropic-compatible"])
_chat_completion_service: Optional[ChatCompletionService] = None


def configure_anthropic_ingress(provider_manager: ProviderManager) -> None:
    """Wire the Anthropic ingress into the same service stack as the OpenAI ingress."""
    global _chat_completion_service
    route_resolver = RouteResolver(provider_manager)
    _chat_completion_service = ChatCompletionService(route_resolver, provider_manager)


def _get_service() -> ChatCompletionService:
    if _chat_completion_service is None:
        raise RuntimeError("Anthropic ingress has not been configured")
    return _chat_completion_service


# ---------------------------------------------------------------------------
#  Request models (text + tool_use/tool_result blocks)
# ---------------------------------------------------------------------------

class AnthropicTextBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["text"] = "text"
    text: str = Field(..., min_length=1)


class AnthropicToolUseBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["tool_use"] = "tool_use"
    id: str = Field(default_factory=lambda: f"toolu_{uuid.uuid4().hex[:12]}")
    name: str
    input: Dict[str, Any] = Field(default_factory=dict)


class AnthropicToolResultBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["tool_result"] = "tool_result"
    tool_use_id: str = Field(default="")
    content: str = Field(default="")


AnthropicContentBlock = Any


class AnthropicMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: Any = Field(..., description="string or list of content blocks")

    @model_validator(mode="after")
    def _content_nonempty(self) -> "AnthropicMessage":
        if isinstance(self.content, str) and not self.content.strip():
            raise ValueError("message content must not be empty")
        return self


class AnthropicMessagesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model: str = Field(..., description="Model id (tmv-* names are alias-mapped)")
    max_tokens: int = Field(default=1024, ge=1)
    messages: List[AnthropicMessage] = Field(..., min_length=1)
    stream: bool = Field(default=False)
    system: Optional[str] = Field(default=None)
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    # Tools in Anthropic format: {name, description, input_schema}
    # (④修复: agent-loop 请求带 tools，此前 extra_forbid 422 → 100% 走
    # fallback；现放行并转换为 OpenAI 格式透传给 provider)
    tools: Optional[List[Dict[str, Any]]] = Field(default=None)
    tool_choice: Optional[Any] = Field(default=None)
    # TriStaciss extensions (passthrough, aligned with the OpenAI ingress)
    tag: Optional[str] = Field(default=None)
    model_tag: Optional[str] = Field(default=None, alias="modelTag")
    route_meta: Optional[RouteMeta] = Field(default=None, alias="routeMeta")


# ---------------------------------------------------------------------------
#  Response models
# ---------------------------------------------------------------------------

class AnthropicUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0


class AnthropicResponseTextBlock(BaseModel):
    type: Literal["text"] = "text"
    text: str


class AnthropicMessagesResponse(BaseModel):
    id: str
    type: Literal["message"] = "message"
    role: Literal["assistant"] = "assistant"
    content: List[AnthropicResponseTextBlock]
    model: str
    stop_reason: Optional[str] = None
    stop_sequence: Optional[str] = None
    usage: AnthropicUsage
    tmv: Optional[Dict[str, Any]] = Field(default=None)


# ---------------------------------------------------------------------------
#  Translation helpers
# ---------------------------------------------------------------------------

def _flatten_block(block: Any) -> str:
    if isinstance(block, str):
        return block
    if isinstance(block, dict):
        btype = block.get("type")
        if btype == "text":
            return block.get("text", "")
        if btype == "tool_use":
            return f"[tool_use name={block.get('name')}]"
        if btype == "tool_result":
            content = block.get("content", "")
            if isinstance(content, list):
                content = " ".join(
                    (c.get("text", "") if isinstance(c, dict) else str(c)) for c in content
                )
            return f"[tool_result] {content}"
        return ""
    # pydantic model instances
    for attr in ("type",):
        pass
    btype = getattr(block, "type", None)
    if btype == "text":
        return getattr(block, "text", "")
    if btype == "tool_use":
        return f"[tool_use name={getattr(block, 'name', '')}]"
    if btype == "tool_result":
        return f"[tool_result] {getattr(block, 'content', '')}"
    return str(block)


def _to_openai_request(req: AnthropicMessagesRequest) -> OpenAIChatCompletionsRequest:
    messages: List[OpenAIChatMessage] = []

    if req.system:
        messages.append(OpenAIChatMessage(role="system", content=req.system))

    for msg in req.messages:
        content = msg.content
        if isinstance(content, list):
            parts = [_flatten_block(b) for b in content]
            text = "\n".join(p for p in parts if p).strip()
            if not text:
                text = "(tool interaction)"
        else:
            text = content
        messages.append(OpenAIChatMessage(role=msg.role, content=text))

    # Anthropic tools ({name, description, input_schema}) → OpenAI tools
    # ({type:"function", function:{name, description, parameters}})
    openai_tools: Optional[List[Dict[str, Any]]] = None
    if req.tools:
        openai_tools = [
            {
                "type": "function",
                "function": {
                    "name": t.get("name", ""),
                    "description": t.get("description", ""),
                    "parameters": t.get("input_schema", {"type": "object", "properties": {}}),
                },
            }
            for t in req.tools
        ]

    return OpenAIChatCompletionsRequest(
        model=req.model,
        messages=messages,
        stream=req.stream,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
        tools=openai_tools,
        tool_choice=req.tool_choice,
        tag=req.tag,
        model_tag=req.model_tag,
        route_meta=req.route_meta,
    )


# ---------------------------------------------------------------------------
#  Non-streaming handler
# ---------------------------------------------------------------------------

@router.post(
    "/messages",
    response_model=AnthropicMessagesResponse,
    responses={
        400: {"description": "Bad request / route not resolved"},
        501: {"description": "Feature not ready"},
        502: {"description": "All providers failed (fallback exhausted)"},
    },
)
async def messages_handler(request: AnthropicMessagesRequest):
    """POST /v1/messages — Anthropic-compatible Messages API."""
    service = _get_service()

    try:
        if request.stream:
            return StreamingResponse(
                _stream_messages(service, request),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )

        openai_req = _to_openai_request(request)
        openai_resp = await service.create_completion(openai_req)

        content_text = openai_resp.choices[0].message.content if openai_resp.choices else ""
        return AnthropicMessagesResponse(
            id=f"msg_{openai_resp.id}",
            content=[AnthropicResponseTextBlock(text=content_text)],
            model=openai_resp.model,
            stop_reason="end_turn",
            usage=AnthropicUsage(
                input_tokens=openai_resp.usage.prompt_tokens if openai_resp.usage else 0,
                output_tokens=openai_resp.usage.completion_tokens if openai_resp.usage else 0,
            ),
            tmv=openai_resp.tmv.model_dump(by_alias=True) if openai_resp.tmv else None,
        )

    except RouteResolutionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FeatureNotReadyError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except ProviderFallbackError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
#  Streaming handler (SSE event sequence aligned with Anthropic Messages)
# ---------------------------------------------------------------------------

_STOP_REASON_ANTHROPIC: Dict[Optional[str], str] = {
    None: "end_turn",
    "stop": "end_turn",
    "length": "max_tokens",
    "max_tokens": "max_tokens",
    "content_filter": "end_turn",
}


def _sse_event(event: str, data: Any) -> str:
    if hasattr(data, "model_dump_json"):
        payload = data.model_dump_json(by_alias=True, exclude_none=True)
    else:
        payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


async def _stream_messages(
    service: ChatCompletionService,
    request: AnthropicMessagesRequest,
) -> AsyncGenerator[str, None]:
    openai_req = _to_openai_request(request)
    response_id = f"msg_{uuid.uuid4()}"
    resolved_model = openai_req.model
    stream_started = False
    content_block_opened = False
    total_output_tokens = 0
    tmv_meta: Optional[Dict[str, Any]] = None

    try:
        async for chunk in service.stream_completion(openai_req):
            if chunk.model:
                resolved_model = chunk.model
            if chunk.tmv and tmv_meta is None:
                tmv_meta = chunk.tmv.model_dump(by_alias=True)

            delta_text: Optional[str] = None
            finish_reason: Optional[str] = None
            if chunk.choices:
                choice = chunk.choices[0]
                if choice.delta:
                    if choice.delta.role and not stream_started:
                        yield _sse_event("message_start", {
                            "type": "message_start",
                            "message": {
                                "id": response_id,
                                "type": "message",
                                "role": "assistant",
                                "content": [],
                                "model": resolved_model,
                                "stop_reason": None,
                                "stop_sequence": None,
                                "usage": {"input_tokens": 0, "output_tokens": 0},
                            },
                        })
                        stream_started = True
                        continue
                    if choice.delta.content:
                        delta_text = choice.delta.content
                if choice.finish_reason:
                    finish_reason = choice.finish_reason

            if delta_text and not content_block_opened:
                yield _sse_event("content_block_start", {
                    "type": "content_block_start",
                    "index": 0,
                    "content_block": {"type": "text", "text": ""},
                })
                content_block_opened = True

            if delta_text:
                yield _sse_event("content_block_delta", {
                    "type": "content_block_delta",
                    "index": 0,
                    "delta": {"type": "text_delta", "text": delta_text},
                })
                total_output_tokens += len(delta_text) // 4

            if finish_reason:
                if content_block_opened:
                    yield _sse_event("content_block_stop", {
                        "type": "content_block_stop",
                        "index": 0,
                    })
                yield _sse_event("message_delta", {
                    "type": "message_delta",
                    "delta": {
                        "stop_reason": _STOP_REASON_ANTHROPIC.get(finish_reason, "end_turn"),
                        "stop_sequence": None,
                    },
                    "usage": {"output_tokens": total_output_tokens},
                })
                yield _sse_event("message_stop", {"type": "message_stop"})
                return

        # Graceful close when content arrived without an explicit finish_reason
        if content_block_opened:
            yield _sse_event("content_block_stop", {"type": "content_block_stop", "index": 0})
        if stream_started:
            yield _sse_event("message_delta", {
                "type": "message_delta",
                "delta": {"stop_reason": "end_turn", "stop_sequence": None},
                "usage": {"output_tokens": total_output_tokens},
            })
            yield _sse_event("message_stop", {"type": "message_stop"})

    except RouteResolutionError as exc:
        yield _sse_event("error", {"type": "error", "error": {"type": "route_not_found", "message": str(exc)}})
    except FeatureNotReadyError as exc:
        yield _sse_event("error", {"type": "error", "error": {"type": "feature_not_ready", "message": str(exc)}})
    except ProviderFallbackError as exc:
        yield _sse_event("error", {"type": "error", "error": {"type": "provider_unavailable", "message": str(exc)}})
