from pathlib import Path

from config_manager import ConfigManager


def test_save_and_get_provider_config(tmp_path: Path):
    config_file = tmp_path / "provider_configs.json"
    manager = ConfigManager(str(config_file))

    ok = manager.save_provider_config(
        "openrouter",
        {
            "api_key": "k-test",
            "base_url": "https://example.com/v1",
            "default_model": "gpt-test",
            "enabled": True,
            "openai_compatible": True,
            "enabled_models": ["gpt-test", "gpt-test-mini"],
        },
    )

    assert ok is True
    cfg = manager.get_provider_config("openrouter")
    assert cfg is not None
    assert cfg["api_key"] == ""
    saved_payload = config_file.read_text(encoding="utf-8")
    assert '"api_key": ""' in saved_payload
    assert cfg["default_model"] == "gpt-test"
    assert cfg["enabled"] is True


def test_delete_provider_config(tmp_path: Path):
    config_file = tmp_path / "provider_configs.json"
    manager = ConfigManager(str(config_file))

    manager.save_provider_config("glm", {"api_key": "abc", "enabled": True})
    assert manager.get_provider_config("glm") is not None

    deleted = manager.delete_provider_config("glm")
    assert deleted is True
    assert manager.get_provider_config("glm") is None


def test_example_template_and_env_override_do_not_require_committed_secret_file(
    tmp_path: Path, monkeypatch
):
    example_file = tmp_path / "provider_configs.example.json"
    example_file.write_text(
        '{"providers": {"deepseek": {"api_key": "", "base_url": "https://api.deepseek.com/v1", "default_model": "deepseek-chat", "enabled": true}}}',
        encoding="utf-8",
    )
    monkeypatch.setenv("DEEPSEEK_API_KEY", "env-deepseek-key")

    manager = ConfigManager(str(tmp_path / "provider_configs.json"))

    cfg = manager.get_provider_config("deepseek")
    assert cfg is not None
    assert cfg["api_key"] == "env-deepseek-key"
    assert cfg["has_api_key"] is True
    redacted_cfg = manager.get_provider_config("deepseek", include_secrets=False)
    assert redacted_cfg is not None
    assert redacted_cfg["api_key"] == manager.SECRET_PLACEHOLDER
    assert not (tmp_path / "provider_configs.json").exists()


def test_save_provider_config_accepts_camel_case_fields(tmp_path: Path):
    config_file = tmp_path / "provider_configs.json"
    manager = ConfigManager(str(config_file))

    ok = manager.save_provider_config(
        "glm",
        {
            "apiKey": "glm-key",
            "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
            "defaultModel": "glm-4.5",
            "enabled": True,
            "openaiCompatible": True,
            "enabledModels": ["glm-4.5"],
        },
    )

    assert ok is True
    cfg = manager.get_provider_config("glm")
    assert cfg is not None
    assert cfg["api_key"] == ""
    assert cfg["default_model"] == "glm-4.5"
    assert cfg["openai_compatible"] is True


def test_file_api_key_is_ignored_without_env(tmp_path: Path):
    config_file = tmp_path / "provider_configs.json"
    config_file.write_text(
        '{"providers": {"glm": {"api_key": "file-secret", "base_url": "https://open.bigmodel.cn/api/paas/v4", "default_model": "glm-4.5", "enabled": true}}}',
        encoding="utf-8",
    )

    manager = ConfigManager(str(config_file))

    cfg = manager.get_provider_config("glm")
    assert cfg is not None
    assert cfg["api_key"] == ""
    assert cfg["has_api_key"] is False
