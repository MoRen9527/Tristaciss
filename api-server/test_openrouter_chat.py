"""
OpenRouter 聊天功能测试

测试OpenRouter Provider的聊天功能是否正常
"""

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
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
    )

async def test_openrouter_chat():
    """测试OpenRouter聊天功能"""
    
    print("=== OpenRouter 聊天功能测试 ===\n")
    
    config = load_config()
    print("🔑 API Key: [已通过环境变量加载]")
    print(f"🌐 Base URL: {config.base_url}\n")
    
    # 创建OpenRouter Provider
    provider = OpenRouterProvider(config)
    
    # 测试消息
    messages = [
        {"role": "user", "content": "讲个笑话"}
    ]
    
    print("1. 测试免费模型聊天:")
    
    # 测试不同的免费模型
    free_models = [
        "deepseek/deepseek-r1:free",
        "qwen/qwen3-8b:free",
        "openai/gpt-4o"  # 付费模型作为对比
    ]
    
    for model in free_models:
        print(f"\n测试模型: {model}")
        print(f"是否免费: {'✅' if provider.is_free_model(model) else '❌'}")
        
        try:
            # 测试聊天完成
            response_content = ""
            async for chunk in provider.chat_completion(
                messages=messages,
                model=model,
                stream=True,
                temperature=0.7,
                max_tokens=500
            ):
                response_content += chunk.content
                print(chunk.content, end="", flush=True)
            
            print(f"\n完整回复: {response_content}")
            print("-" * 50)
            
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            print("-" * 50)

if __name__ == "__main__":
    try:
        asyncio.run(test_openrouter_chat())
    except RuntimeError as e:
        print(f"\n❌ 配置错误: {e}")
        raise SystemExit(1) from e