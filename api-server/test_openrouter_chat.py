"""
OpenRouter 聊天功能测试

测试OpenRouter Provider的聊天功能是否正常
"""

import asyncio
import json
from providers.openrouter import OpenRouterProvider
from providers.base import ProviderConfig, ProviderType

async def test_openrouter_chat():
    """测试OpenRouter聊天功能"""
    
    print("=== OpenRouter 聊天功能测试 ===\n")
    
    # 创建OpenRouter配置
    config = ProviderConfig(
        name="openrouter",
        provider_type=ProviderType.OPENROUTER,
        api_key="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",  # 使用实际的API Key
        base_url="https://openrouter.ai/api/v1",
        openai_compatible=True
    )
    
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
    asyncio.run(test_openrouter_chat())