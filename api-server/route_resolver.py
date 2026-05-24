from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from openai_ingress_models import OpenAIChatCompletionsRequest
from providers import ProviderManager


class RouteResolutionError(Exception):
    pass


@dataclass
class RouteCandidate:
    provider: str
    model: str
    reason: str
    score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ResolvedRoute:
    provider: str
    model: str
    route_policy: str
    resolved_tag: Optional[str] = None
    resolved_model_tag: Optional[str] = None
    candidates: List[RouteCandidate] = field(default_factory=list)


class RouteResolver:
    def __init__(self, provider_manager: ProviderManager):
        self._provider_manager = provider_manager

    def resolve_chat_completion(self, request: OpenAIChatCompletionsRequest) -> ResolvedRoute:
        route_meta = request.route_meta
        if route_meta and route_meta.provider:
            return self._resolve_explicit_provider(request)
        return self._resolve_intent_route(request)

    def _resolve_explicit_provider(self, request: OpenAIChatCompletionsRequest) -> ResolvedRoute:
        route_meta = request.route_meta
        provider_name = route_meta.provider if route_meta else None
        provider = self._provider_manager.get_provider(provider_name) if provider_name else None
        if not provider or not provider_name:
            raise RouteResolutionError(f"Unknown provider override: {provider_name}")

        model = self._choose_model(
            explicit_model=route_meta.model if route_meta else None,
            request_model=request.model,
            fallback_model=provider.config.default_model,
        )
        candidate = RouteCandidate(
            provider=provider_name,
            model=model,
            reason="explicit_route_meta_provider",
            metadata={"routeMeta": route_meta.model_dump(by_alias=True)} if route_meta else {},
        )
        return ResolvedRoute(
            provider=provider_name,
            model=model,
            route_policy="explicit_provider",
            resolved_tag=request.tag,
            resolved_model_tag=request.model_tag,
            candidates=[candidate],
        )

    def _resolve_intent_route(self, request: OpenAIChatCompletionsRequest) -> ResolvedRoute:
        available_providers = list(self._provider_manager.provider_names)
        if not available_providers:
            raise RouteResolutionError("No runtime providers available")

        features = self._analyze_request(request)
        scored_candidates: List[RouteCandidate] = []

        for provider_name in available_providers:
            provider = self._provider_manager.get_provider(provider_name)
            if not provider:
                continue

            model = self._choose_model(
                explicit_model=None,
                request_model=request.model,
                fallback_model=provider.config.default_model,
            )
            score, reason, metadata = self._score_provider(provider_name, features)
            metadata.update({
                "tag": request.tag,
                "modelTag": request.model_tag,
                "taskType": features["task_type"],
                "complexity": features["complexity"],
                "costSensitivity": features["cost_sensitivity"],
                "qualityPriority": features["quality_priority"],
            })
            scored_candidates.append(
                RouteCandidate(
                    provider=provider_name,
                    model=model,
                    reason=reason,
                    score=score,
                    metadata=metadata,
                )
            )

        if not scored_candidates:
            return self._resolve_default_route(request)

        scored_candidates.sort(key=lambda candidate: candidate.score, reverse=True)
        winner = scored_candidates[0]
        return ResolvedRoute(
            provider=winner.provider,
            model=winner.model,
            route_policy="intent_cost_router_v1",
            resolved_tag=request.tag,
            resolved_model_tag=request.model_tag,
            candidates=scored_candidates,
        )

    def _resolve_default_route(self, request: OpenAIChatCompletionsRequest) -> ResolvedRoute:
        default_provider_name = self._provider_manager.default_provider_name
        default_provider = self._provider_manager.get_provider(default_provider_name) if default_provider_name else None
        if not default_provider or not default_provider_name:
            raise RouteResolutionError("No default provider available")

        model = self._choose_model(
            explicit_model=None,
            request_model=request.model,
            fallback_model=default_provider.config.default_model,
        )
        candidate = RouteCandidate(
            provider=default_provider_name,
            model=model,
            reason="default_provider",
        )
        return ResolvedRoute(
            provider=default_provider_name,
            model=model,
            route_policy="default_provider",
            resolved_tag=request.tag,
            resolved_model_tag=request.model_tag,
            candidates=[candidate],
        )

    def _analyze_request(self, request: OpenAIChatCompletionsRequest) -> Dict[str, Any]:
        user_text = "\n".join(message.content for message in request.messages if message.role == "user")
        normalized_text = user_text.lower()
        tag_text = " ".join(filter(None, [request.tag, request.model_tag])).lower()
        workspace_language = (request.workspace.language.lower() if request.workspace and request.workspace.language else "")
        task_hint = request.task_hint
        policy = request.policy

        code_keywords = [
            "code", "coding", "implement", "implementation", "refactor", "debug", "bug", "fix",
            "function", "class", "api", "sql", "script", "typescript", "javascript", "python",
            "java", "golang", "rust", "测试", "代码", "实现", "重构", "调试", "修复", "报错",
        ]
        reasoning_keywords = [
            "analyze", "analysis", "reason", "reasoning", "compare", "tradeoff", "strategy", "plan",
            "prove", "math", "derive", "why", "root cause", "架构", "方案", "分析", "推理", "比较",
            "权衡", "规划", "证明", "计算", "复杂",
        ]
        cost_keywords = ["cheap", "budget", "cost", "affordable", "low cost", "省钱", "便宜", "成本", "预算"]
        quality_keywords = ["best", "highest quality", "premium", "top tier", "质量优先", "最高质量", "不计成本"]

        code_score = sum(1 for keyword in code_keywords if keyword in normalized_text or keyword in tag_text)
        reasoning_score = sum(1 for keyword in reasoning_keywords if keyword in normalized_text or keyword in tag_text)
        if workspace_language:
            code_score += 2
        if task_hint and task_hint.expected_artifacts:
            artifact_text = " ".join(task_hint.expected_artifacts).lower()
            if any(token in artifact_text for token in ["code", "patch", "diff", "test", "implementation"]):
                code_score += 2

        complexity_score = 0
        if len(user_text) > 240:
            complexity_score += 1
        if len(user_text) > 800:
            complexity_score += 1
        if user_text.count("\n") >= 4:
            complexity_score += 1
        if any(token in normalized_text for token in ["step by step", "一步一步", "详细", "系统设计", "architecture", "tradeoff"]):
            complexity_score += 1
        if reasoning_score >= 2:
            complexity_score += 1

        task_type = "general"
        if code_score >= reasoning_score + 1:
            task_type = "code"
        elif reasoning_score >= code_score + 1:
            task_type = "reasoning"

        cost_preference = (policy.cost_preference.lower() if policy and policy.cost_preference else "")
        quality_preference = (policy.quality_preference.lower() if policy and policy.quality_preference else "")
        if task_hint and task_hint.reasoning_effort and task_hint.reasoning_effort.lower() in {"high", "deep"}:
            complexity_score += 1

        cost_sensitivity = "balanced"
        if cost_preference in {"low", "cheap", "budget", "sensitive"} or any(keyword in normalized_text for keyword in cost_keywords):
            cost_sensitivity = "high"
        elif quality_preference in {"high", "premium", "best"} or any(keyword in normalized_text for keyword in quality_keywords):
            cost_sensitivity = "low"

        quality_priority = "balanced"
        if quality_preference in {"high", "premium", "best"}:
            quality_priority = "high"
        elif cost_sensitivity == "high":
            quality_priority = "balanced"

        complexity = "low"
        if complexity_score >= 4:
            complexity = "high"
        elif complexity_score >= 2:
            complexity = "medium"

        return {
            "task_type": task_type,
            "complexity": complexity,
            "cost_sensitivity": cost_sensitivity,
            "quality_priority": quality_priority,
            "workspace_language": workspace_language,
            "user_text": user_text,
        }

    @staticmethod
    def _score_provider(provider_name: str, features: Dict[str, Any]) -> tuple[float, str, Dict[str, Any]]:
        task_type = features["task_type"]
        complexity = features["complexity"]
        cost_sensitivity = features["cost_sensitivity"]
        quality_priority = features["quality_priority"]

        score = 1.0
        reasons: List[str] = []

        if provider_name == "deepseek":
            if task_type == "reasoning":
                score += 6
                reasons.append("reasoning_strength")
            if task_type == "general":
                score += 3
                reasons.append("generalist_budget")
            if cost_sensitivity == "high":
                score += 4
                reasons.append("cost_efficient")
            if complexity in {"medium", "high"}:
                score += 2
                reasons.append("handles_complex_reasoning")
        elif provider_name == "glm":
            if task_type == "code":
                score += 6
                reasons.append("code_strength")
            if features["workspace_language"]:
                score += 2
                reasons.append("workspace_language_hint")
            if cost_sensitivity == "high":
                score += 4
                reasons.append("cost_efficient")
            if task_type == "general":
                score += 2
                reasons.append("generalist_fallback")
        elif provider_name == "openai":
            score += 3
            reasons.append("premium_generalist")
            if quality_priority == "high":
                score += 4
                reasons.append("quality_priority")
            if complexity == "high":
                score += 3
                reasons.append("complex_task_quality")
            if cost_sensitivity == "high":
                score -= 4
                reasons.append("cost_penalty")
        elif provider_name == "anthropic":
            score += 3
            reasons.append("premium_code_generalist")
            if task_type == "code":
                score += 5
                reasons.append("premium_code_quality")
            if quality_priority == "high":
                score += 4
                reasons.append("quality_priority")
            if cost_sensitivity == "high":
                score -= 4
                reasons.append("cost_penalty")

        if quality_priority == "high" and provider_name in {"deepseek", "glm"}:
            score += 1
            reasons.append("balanced_quality_support")

        return score, "+".join(reasons) or "balanced_fallback", {"features": features}

    @staticmethod
    def _choose_model(explicit_model: Optional[str], request_model: Optional[str], fallback_model: Optional[str]) -> str:
        for candidate in (explicit_model, request_model, fallback_model):
            if candidate and candidate != "auto":
                return candidate
        if fallback_model:
            return fallback_model
        raise RouteResolutionError("No model could be resolved for the request")