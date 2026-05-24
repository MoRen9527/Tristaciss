import json
from pathlib import Path

from config_manager import ConfigManager
import providers.manager as provider_manager_module


def test_runtime_provider_registry_only_loads_enabled_supported_configs(
    tmp_path: Path, monkeypatch
):
    monkeypatch.setenv("OPENROUTER_API_KEY", "env-openrouter")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "env-deepseek")
    monkeypatch.setenv("GLM_API_KEY", "env-glm")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "env-anthropic")

    config_file = tmp_path / "provider_configs.json"
    config_file.write_text(
        json.dumps(
            {
                "providers": {
                    "openrouter": {
                        "api_key": "",
                        "base_url": "https://openrouter.ai/api/v1",
                        "default_model": "deepseek/deepseek-r1:free",
                        "enabled": True,
                    },
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
                    "openai": {
                        "api_key": "",
                        "base_url": "https://api.openai.com/v1",
                        "default_model": "gpt-4o",
                        "enabled": False,
                    },
                    "anthropic": {
                        "api_key": "",
                        "base_url": "https://api.anthropic.com",
                        "default_model": "claude-3-5-sonnet-20241022",
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

    manager = provider_manager_module.ProviderManager()

    assert set(manager.provider_names) == {"openrouter", "deepseek", "glm"}
    assert manager.default_provider_name == "openrouter"
    assert manager.get_provider("openai") is None
    assert manager.get_provider("anthropic") is None
