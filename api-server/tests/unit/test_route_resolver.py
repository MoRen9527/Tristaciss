import json
from pathlib import Path

from config_manager import ConfigManager
from openai_ingress_models import OpenAIChatCompletionsRequest
import providers.manager as provider_manager_module
from route_resolver import RouteResolver


def _build_provider_manager(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "env-deepseek")
    monkeypatch.setenv("GLM_API_KEY", "env-glm")

    config_file = tmp_path / "provider_configs.json"
    config_file.write_text(
        json.dumps(
            {
                "providers": {
                    "deepseek": {
                        "api_key": "",
                        "base_url": "https://api.deepseek.com/v1",
                        "default_model": "deepseek-chat",
                        "enabled": True,
                    },
                    "glm": {
                        "api_key": "",
                        "base_url": "https://open.bigmodel.cn/api/paas/v4",
                        "default_model": "glm-4.5",
                        "enabled": True,
                    },
                }
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    test_config_manager = ConfigManager(str(config_file))
    monkeypatch.setattr(provider_manager_module, "config_manager", test_config_manager)
    return provider_manager_module.ProviderManager()


def test_route_resolver_prefers_deepseek_for_reasoning_budget_requests(tmp_path: Path, monkeypatch):
    manager = _build_provider_manager(tmp_path, monkeypatch)
    resolver = RouteResolver(manager)

    request = OpenAIChatCompletionsRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "请分析一下多模型路由的架构权衡，并给出一个成本敏感的推理方案"}],
            "policy": {"costPreference": "cheap"},
        }
    )

    resolved = resolver.resolve_chat_completion(request)

    assert resolved.provider == "deepseek"
    assert resolved.model == "deepseek-chat"
    assert resolved.route_policy == "intent_cost_router_v1"


def test_route_resolver_prefers_glm_for_code_requests(tmp_path: Path, monkeypatch):
    manager = _build_provider_manager(tmp_path, monkeypatch)
    resolver = RouteResolver(manager)

    request = OpenAIChatCompletionsRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "请帮我实现一个 Python 函数，读取 JSON 文件并返回去重后的 key 列表"}],
            "workspace": {"language": "python"},
            "policy": {"costPreference": "cheap"},
        }
    )

    resolved = resolver.resolve_chat_completion(request)

    assert resolved.provider == "glm"
    assert resolved.model == "glm-4.5"
    assert resolved.route_policy == "intent_cost_router_v1"
