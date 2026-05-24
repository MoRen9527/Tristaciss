"""配置管理器。

安全约束：
1. 可提交模板文件使用 provider_configs.example.json
2. provider_configs.json 只保存非敏感 provider 元数据，并被 .gitignore 忽略
3. API Key 只从环境变量读取，不从本地 JSON 文件读取，也不写回本地文件
"""

import copy
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class ConfigManager:
    """Provider 配置管理器。"""

    SECRET_PLACEHOLDER = "__ENV_CONFIGURED__"

    _ENV_PREFIX_MAP = {
        "openrouter": "OPENROUTER",
        "openrouter_compatible": "OPENROUTER",
        "openrouter_official": "OPENROUTER",
        "openai": "OPENAI",
        "deepseek": "DEEPSEEK",
        "glm": "GLM",
        "google": "GOOGLE",
        "meta": "META",
        "anthropic": "ANTHROPIC",
        "qwen": "QWEN",
        "moonshot": "MOONSHOT",
        "together": "TOGETHER",
        "groq": "GROQ",
        "modelscope": "MODELSCOPE",
        "huggingface": "HUGGINGFACE",
    }

    def __init__(self, config_file: str = "provider_configs.json"):
        self.config_file = Path(config_file)
        self.example_config_file = self.config_file.with_name(
            f"{self.config_file.stem}.example{self.config_file.suffix}"
        )
        self.configs: Dict[str, Any] = {}
        self._load_configs()

    def _load_configs(self):
        """加载本地配置；若本地不存在则回退到可提交模板。"""
        try:
            source_path = None
            if self.config_file.exists():
                source_path = self.config_file
            elif self.example_config_file.exists():
                source_path = self.example_config_file

            if source_path:
                with open(source_path, "r", encoding="utf-8") as file_handle:
                    self.configs = json.load(file_handle)
                logger.info(f"已加载配置文件: {source_path}")
            else:
                logger.info("未找到 provider 配置文件，使用空配置")
                self.configs = {}
        except Exception as exc:
            logger.error(f"加载配置文件失败: {exc}")
            self.configs = {}

    def _save_configs(self):
        """只保存到本地忽略文件，不写回 example 模板。"""
        try:
            with open(self.config_file, "w", encoding="utf-8") as file_handle:
                json.dump(self.configs, file_handle, indent=2, ensure_ascii=False)
            logger.info(f"配置已保存到: {self.config_file}")
        except Exception as exc:
            logger.error(f"保存配置文件失败: {exc}")

    def _resolve_configs(self, include_secrets: bool = True) -> Dict[str, Any]:
        resolved = copy.deepcopy(self.configs)
        providers = resolved.setdefault("providers", {})

        for provider_name, provider_config in providers.items():
            prefix = self._ENV_PREFIX_MAP.get(provider_name, provider_name.upper())

            api_key = os.getenv(f"{prefix}_API_KEY")
            has_api_key = bool(api_key)
            provider_config["api_key"] = (
                api_key
                if include_secrets and has_api_key
                else (self.SECRET_PLACEHOLDER if has_api_key else "")
            )
            provider_config["has_api_key"] = has_api_key
            provider_config["api_key_source"] = "env" if has_api_key else "unset"

            base_url = os.getenv(f"{prefix}_BASE_URL")
            if base_url:
                provider_config["base_url"] = base_url

            default_model = os.getenv(f"{prefix}_DEFAULT_MODEL")
            if default_model:
                provider_config["default_model"] = default_model

        return resolved

    @staticmethod
    def _normalize_provider_config(config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "api_key": "",
            "base_url": config.get("base_url", config.get("baseUrl", "")),
            "default_model": config.get("default_model", config.get("defaultModel", "")),
            "enabled": config.get("enabled", False),
            "openai_compatible": config.get(
                "openai_compatible", config.get("openaiCompatible", False)
            ),
            "enabled_models": config.get(
                "enabled_models", config.get("enabledModels", [])
            ),
        }

    def get_provider_config(
        self, provider_name: str, include_secrets: bool = True
    ) -> Optional[Dict[str, Any]]:
        return self._resolve_configs(include_secrets=include_secrets).get("providers", {}).get(provider_name)

    def get_all_provider_configs(
        self, include_secrets: bool = True
    ) -> Dict[str, Dict[str, Any]]:
        return self._resolve_configs(include_secrets=include_secrets).get("providers", {})

    def save_provider_config(self, provider_name: str, config: Dict[str, Any]) -> bool:
        try:
            if "providers" not in self.configs:
                self.configs["providers"] = {}

            submitted_api_key = config.get("api_key", config.get("apiKey", ""))
            if submitted_api_key and submitted_api_key != self.SECRET_PLACEHOLDER:
                logger.info(
                    "忽略 Provider %s 的 api_key 持久化请求；运行时仅支持环境变量",
                    provider_name,
                )

            normalized_config = self._normalize_provider_config(config)
            normalized_config["updated_at"] = datetime.now().isoformat()
            self.configs["providers"][provider_name] = normalized_config

            self._save_configs()
            logger.info(f"已保存Provider配置: {provider_name}")
            return True
        except Exception as exc:
            logger.error(f"保存Provider配置失败 - {provider_name}: {exc}")
            return False

    def delete_provider_config(self, provider_name: str) -> bool:
        try:
            if "providers" in self.configs and provider_name in self.configs["providers"]:
                del self.configs["providers"][provider_name]
                self._save_configs()
                logger.info(f"已删除Provider配置: {provider_name}")
                return True
            return False
        except Exception as exc:
            logger.error(f"删除Provider配置失败 - {provider_name}: {exc}")
            return False


config_manager = ConfigManager()