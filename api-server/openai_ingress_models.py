from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True)


ChatRole = Literal["system", "user", "assistant"]


class OpenAIChatMessage(StrictModel):
    role: ChatRole = Field(..., description="OpenAI-compatible chat role")
    content: str = Field(..., min_length=1, description="Message content")


class RouteMeta(StrictModel):
    provider: Optional[str] = Field(default=None, description="Whitelisted provider override")
    model: Optional[str] = Field(default=None, description="Whitelisted model override")
    region: Optional[str] = Field(default=None, description="Region hint")
    tenant: Optional[str] = Field(default=None, description="Tenant hint")
    latency_class: Optional[str] = Field(default=None, alias="latencyClass", description="Latency hint")


class WorkspaceContext(StrictModel):
    workspace_id: Optional[str] = Field(default=None, alias="workspaceId")
    repo: Optional[str] = Field(default=None)
    branch: Optional[str] = Field(default=None)
    language: Optional[str] = Field(default=None)


class PolicyContext(StrictModel):
    require_approval: Optional[bool] = Field(default=None, alias="requireApproval")
    risk_level: Optional[str] = Field(default=None, alias="riskLevel")
    data_class: Optional[str] = Field(default=None, alias="dataClass")
    cost_preference: Optional[str] = Field(default=None, alias="costPreference")
    quality_preference: Optional[str] = Field(default=None, alias="qualityPreference")


class TaskHint(StrictModel):
    task_type: Optional[str] = Field(default="interactive_chat", alias="taskType")
    sync_mode: Optional[str] = Field(default="sync", alias="syncMode")
    expected_artifacts: Optional[List[str]] = Field(default=None, alias="expectedArtifacts")
    task_domain: Optional[str] = Field(default=None, alias="taskDomain")
    reasoning_effort: Optional[str] = Field(default=None, alias="reasoningEffort")


class UserMeta(StrictModel):
    user_id: Optional[str] = Field(default=None, alias="userId")
    team_id: Optional[str] = Field(default=None, alias="teamId")
    session_id: Optional[str] = Field(default=None, alias="sessionId")


class OpenAIChatCompletionsRequest(StrictModel):
    messages: List[OpenAIChatMessage] = Field(..., min_items=1)
    model: Optional[str] = Field(default="auto")
    stream: bool = Field(default=False)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0)
    tag: Optional[str] = Field(default=None)
    model_tag: Optional[str] = Field(default=None, alias="modelTag")
    route_meta: Optional[RouteMeta] = Field(default=None, alias="routeMeta")
    workspace: Optional[WorkspaceContext] = Field(default=None)
    policy: Optional[PolicyContext] = Field(default=None)
    task_hint: Optional[TaskHint] = Field(default=None, alias="taskHint")
    user_meta: Optional[UserMeta] = Field(default=None, alias="userMeta")

    @model_validator(mode="after")
    def validate_phase_c_constraints(self) -> "OpenAIChatCompletionsRequest":
        task_hint = self.task_hint
        if task_hint and task_hint.task_type not in (None, "interactive_chat"):
            raise ValueError("Phase C only supports interactive_chat requests")
        return self


class TmvRouteMeta(StrictModel):
    request_id: str = Field(..., alias="requestId")
    resolved_tag: Optional[str] = Field(default=None, alias="resolvedTag")
    resolved_model_tag: Optional[str] = Field(default=None, alias="resolvedModelTag")
    resolved_provider: Optional[str] = Field(default=None, alias="resolvedProvider")
    resolved_model: Optional[str] = Field(default=None, alias="resolvedModel")
    route_policy: Optional[str] = Field(default=None, alias="routePolicy")


class AssistantMessage(StrictModel):
    role: Literal["assistant"] = "assistant"
    content: str = Field(..., min_length=1)


class CompletionChoice(StrictModel):
    index: int
    message: AssistantMessage
    finish_reason: Optional[str] = Field(default=None)


class UsageStats(StrictModel):
    prompt_tokens: int = Field(..., alias="prompt_tokens", ge=0)
    completion_tokens: int = Field(..., alias="completion_tokens", ge=0)
    total_tokens: int = Field(..., alias="total_tokens", ge=0)


class OpenAIChatCompletionsResponse(StrictModel):
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: List[CompletionChoice]
    usage: Optional[UsageStats] = None
    tmv: Optional[TmvRouteMeta] = None


class DeltaMessage(StrictModel):
    role: Optional[Literal["assistant"]] = None
    content: Optional[str] = None


class ChunkChoice(StrictModel):
    index: int
    delta: DeltaMessage
    finish_reason: Optional[str] = None


class OpenAIChatCompletionChunk(StrictModel):
    id: str
    object: Literal["chat.completion.chunk"] = "chat.completion.chunk"
    created: int
    model: str
    choices: List[ChunkChoice]
    tmv: Optional[TmvRouteMeta] = None


class OpenAIModelCard(StrictModel):
    id: str
    object: Literal["model"] = "model"
    created: int = Field(default=0, ge=0)
    owned_by: str = Field(..., alias="owned_by")
    permission: List[Dict[str, Any]] = Field(default_factory=list)


class OpenAIModelsResponse(StrictModel):
    object: Literal["list"] = "list"
    data: List[OpenAIModelCard]


class OpenAIErrorDetail(StrictModel):
    message: str
    type: str
    param: Optional[str] = None
    code: Optional[str] = None


class OpenAIErrorResponse(StrictModel):
    error: OpenAIErrorDetail


class LegacyChatStreamRequest(StrictModel):
    query: str = Field(..., min_length=1)
    provider: Optional[str] = None
    model: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    chat_mode: Literal["single", "group"] = Field(default="single", alias="chat_mode")
    group_settings: Optional[Dict[str, Any]] = Field(default=None, alias="group_settings")


class LegacySseEvent(StrictModel):
    type: Literal["start", "content", "end", "error"]
    content: Optional[str] = None
    error: Optional[str] = None