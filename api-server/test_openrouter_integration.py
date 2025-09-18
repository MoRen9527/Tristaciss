"""
OpenRouter 双模式集成测试

测试OpenRouter在现有架构中的双模式支持
"""

import asyncio
import json
from providers.manager import ProviderManager
from providers.openrouter import OpenRouterProvider
from providers.base import ProviderConfig, ProviderType

async def test_openrouter_integration():
    """测试OpenRouter集成"""
    
    print("=== OpenRouter 双模式集成测试 ===\n")
    
    # 1. 测试免费模型识别
    print("1. 测试免费模型识别:")
    
    # 创建OpenRouter配置
    config = ProviderConfig(
        name="openrouter",
        provider_type=ProviderType.OPENROUTER,
        api_key="sk-or-v1-placeholder",
        base_url="https://openrouter.ai/api/v1",
        openai_compatible=True
    )
    
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
    await manager.register_provider("openrouter", config)
    
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
    asyncio.run(test_openrouter_integration())