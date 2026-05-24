"""
OpenRouter 双模式集成测试

测试OpenRouter在现有架构中的双模式支持
"""

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from providers.manager import ProviderManager
from providers.openrouter import OpenRouterProvider
from providers.base import ProviderConfig, ProviderType


load_dotenv(Path(__file__).with_name(".env"))


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"缺少环境变量 {name}，请先在 api-server/.env 或当前 shell 中配置")
    return value


def load_config() -> ProviderConfig:
    return ProviderConfig(
        name="openrouter",
        provider_type=ProviderType.OPENROUTER,
        api_key=require_env("OPENROUTER_API_KEY"),
        base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip(),
        openai_compatible=True,
        default_model=os.getenv("OPENROUTER_DEFAULT_MODEL", "deepseek/deepseek-r1:free").strip() or "deepseek/deepseek-r1:free",
    )

async def test_openrouter_integration():
    """测试OpenRouter集成"""
    
    print("=== OpenRouter 双模式集成测试 ===\n")
    
    # 1. 测试免费模型识别
    print("1. 测试免费模型识别:")
    
    config = load_config()
    print("  API Key: [已通过环境变量加载]")
    print(f"  Base URL: {config.base_url}")
    
    # 创建OpenRouter Provider
    provider = OpenRouterProvider(config)
    
    # 测试免费模型识别
    test_models = [
        "deepseek/deepseek-r1:free",
        "qwen/qwen3-8b:free", 
        "openai/gpt-4o",
        "anthropic/claude-3-5-sonnet"
    ]
    
    for model in test_models:
        is_free = provider.is_free_model(model)
        print(f"  {model}: {'✅ 免费' if is_free else '💰 付费'}")
    
    print(f"\n  免费模型总数: {len(provider.get_free_models())}")
    
    # 2. 测试Provider Manager集成
    print("\n2. 测试Provider Manager集成:")
    
    manager = ProviderManager()
    
    # 注册OpenRouter Provider
    manager.register_provider("openrouter", config, skip_validation=True)
    
    # 测试通用免费模型检查
    for model in test_models:
        is_free = manager.is_free_model(model)
        capabilities = manager.get_model_capabilities(model)
        print(f"  {model}: {'✅ 免费' if is_free else '💰 付费'} | 能力: {capabilities}")
    
    # 3. 测试OpenAI兼容模式
    print("\n3. 测试OpenAI兼容模式:")
    print(f"  OpenAI兼容: {config.openai_compatible}")
    print(f"  Base URL: {config.base_url}")
    
    # 4. 测试连接
    print("\n4. 测试连接:")
    try:
        connection_ok = await provider.test_connection()
        print(f"  连接状态: {'✅ 成功' if connection_ok else '❌ 失败'}")
    except Exception as e:
        print(f"  连接状态: ❌ 失败 - {e}")
    
    # 5. 显示配置摘要
    print("\n5. 配置摘要:")
    print(f"  提供商: {config.name}")
    print(f"  类型: {config.provider_type}")
    print(f"  OpenAI兼容: {config.openai_compatible}")
    print(f"  免费模型数量: {len(provider.get_free_models())}")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    try:
        asyncio.run(test_openrouter_integration())
    except RuntimeError as e:
        print(f"\n❌ 配置错误: {e}")
        raise SystemExit(1) from e