#!/usr/bin/env python3
"""
OpenRouter GPT-OSS-20B:Free API 连接测试脚本

测试OpenRouter平台上的gpt-oss-20b:free模型的连接性和可用性
"""

import os
import asyncio
from openai import AsyncOpenAI

# OpenRouter配置
OPENROUTER_API_KEY = "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"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "openai/gpt-oss-20b:free"

print("=" * 60)
print("🧪 OpenRouter GPT-OSS-20B:Free API 连接测试")
print("=" * 60)
print(f"🔑 API Key: {OPENROUTER_API_KEY[:20]}...")
print(f"🌐 Base URL: {OPENROUTER_BASE_URL}")
print(f"🤖 模型: {OPENROUTER_MODEL}")
print("=" * 60)

async def test_openrouter_connection():
    """测试OpenRouter API连接"""
    
    # 初始化客户端
    client = AsyncOpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL
    )
    
    print("\n1️⃣ 测试API连接和认证...")
    try:
        # 测试获取模型列表
        models = await client.models.list()
        print(f"✅ 连接成功！发现 {len(models.data)} 个可用模型")
        
        # 查找目标模型
        target_model_found = False
        for model in models.data:
            if model.id == OPENROUTER_MODEL:
                target_model_found = True
                print(f"✅ 找到目标模型: {model.id}")
                break
        
        if not target_model_found:
            print(f"⚠️  未找到目标模型 {OPENROUTER_MODEL}")
            print("📋 可用的免费模型列表（前10个）:")
            free_models = [m for m in models.data if 'free' in m.id.lower()][:10]
            for i, model in enumerate(free_models):
                print(f"   {i+1}. {model.id}")
            
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False
    
    print(f"\n2️⃣ 测试模型 '{OPENROUTER_MODEL}' 对话功能...")
    try:
        # 测试简单对话
        response = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "user", "content": "What is the meaning of life?"}
            ],
            max_tokens=100,
            temperature=0.7,
            extra_headers={
                "HTTP-Referer": "http://localhost:3001",  # 可选：用于OpenRouter排名
                "X-Title": "Digital Avatar Test",  # 可选：用于OpenRouter排名
            }
        )
        
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens if response.usage else "未知"
        
        print(f"✅ 对话测试成功！")
        print(f"📝 回复内容: {content[:200]}...")
        print(f"🎯 Token使用: {tokens_used}")
        
    except Exception as e:
        print(f"❌ 对话测试失败: {e}")
        return False
    
    print(f"\n3️⃣ 测试流式响应...")
    try:
        # 测试流式对话
        stream = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "user", "content": "Count from 1 to 5"}
            ],
            max_tokens=50,
            temperature=0.1,
            stream=True,
            extra_headers={
                "HTTP-Referer": "http://localhost:3001",
                "X-Title": "Digital Avatar Test",
            }
        )
        
        print("✅ 流式响应测试:")
        chunks_received = 0
        full_response = ""
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                print(f"   📦 收到块: '{content}'")
                chunks_received += 1
        
        print(f"✅ 流式测试成功！共收到 {chunks_received} 个数据块")
        print(f"📝 完整回复: {full_response}")
        
    except Exception as e:
        print(f"❌ 流式测试失败: {e}")
        return False
    
    print(f"\n4️⃣ 测试中文对话...")
    try:
        # 测试中文对话能力
        response = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "user", "content": "你好，请简单介绍一下你自己。"}
            ],
            max_tokens=150,
            temperature=0.7,
            extra_headers={
                "HTTP-Referer": "http://localhost:3001",
                "X-Title": "Digital Avatar Test",
            }
        )
        
        content = response.choices[0].message.content
        print(f"✅ 中文对话测试成功！")
        print(f"📝 中文回复: {content}")
        
    except Exception as e:
        print(f"❌ 中文对话测试失败: {e}")
        return False
    
    print(f"\n5️⃣ 测试错误处理...")
    try:
        # 测试无效模型
        await client.chat.completions.create(
            model="invalid-model-name",
            messages=[
                {"role": "user", "content": "测试"}
            ],
            max_tokens=10
        )
        print("⚠️  错误处理测试: 应该抛出异常但没有")
        
    except Exception as e:
        print(f"✅ 错误处理正常: {type(e).__name__}")
    
    return True

async def main():
    """主测试函数"""
    try:
        success = await test_openrouter_connection()
        
        print("\n" + "=" * 60)
        if success:
            print("🎉 所有测试通过！OpenRouter GPT-OSS-20B:Free API配置正确")
            print("✅ 可以继续进行Provider系统测试")
            print("💡 提示:")
            print("   - 该模型为免费模型，可能有使用限制")
            print("   - 建议在生产环境中监控API使用情况")
        else:
            print("❌ 测试失败！请检查API配置")
            print("💡 建议:")
            print("   1. 验证OpenRouter API Key是否有效")
            print("   2. 检查模型名称是否正确")
            print("   3. 确认网络连接是否正常")
            print("   4. 查看OpenRouter控制台是否有使用限制")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 测试过程中发生严重错误: {e}")

if __name__ == "__main__":
    asyncio.run(main())