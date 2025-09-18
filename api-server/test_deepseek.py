#!/usr/bin/env python3
"""
DeepSeek API 连接测试脚本

测试DeepSeek API的连接性和可用性
"""

import os
import asyncio
from openai import AsyncOpenAI

# 从环境变量获取配置
DEEPSEEK_API_KEY = os.getenv("OPENAI_API_KEY", "sk-fe34348dced24f3da9dfcc38bcdf7734")
DEEPSEEK_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.getenv("OPENAI_DEFAULT_MODEL", "deepseek-chat")

print("=" * 60)
print("🧪 DeepSeek API 连接测试")
print("=" * 60)
print(f"🔑 API Key: {DEEPSEEK_API_KEY[:20]}...")
print(f"🌐 Base URL: {DEEPSEEK_BASE_URL}")
print(f"🤖 模型: {DEEPSEEK_MODEL}")
print("=" * 60)

async def test_deepseek_connection():
    """测试DeepSeek API连接"""
    
    # 初始化客户端
    client = AsyncOpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL
    )
    
    print("\n1️⃣ 测试API连接和认证...")
    try:
        # 测试获取模型列表
        models = await client.models.list()
        print(f"✅ 连接成功！发现 {len(models.data)} 个可用模型")
        
        # 显示前5个模型
        print("📋 可用模型列表（前5个）:")
        for i, model in enumerate(models.data[:5]):
            print(f"   {i+1}. {model.id}")
            
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False
    
    print(f"\n2️⃣ 测试模型 '{DEEPSEEK_MODEL}' 对话功能...")
    try:
        # 测试简单对话
        response = await client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "user", "content": "你好，请简单介绍一下你自己。"}
            ],
            max_tokens=100,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens if response.usage else "未知"
        
        print(f"✅ 对话测试成功！")
        print(f"📝 回复内容: {content[:100]}...")
        print(f"🎯 Token使用: {tokens_used}")
        
    except Exception as e:
        print(f"❌ 对话测试失败: {e}")
        return False
    
    print(f"\n3️⃣ 测试流式响应...")
    try:
        # 测试流式对话
        stream = await client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "user", "content": "请数1到5"}
            ],
            max_tokens=50,
            temperature=0.1,
            stream=True
        )
        
        print("✅ 流式响应测试:")
        chunks_received = 0
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                print(f"   📦 收到块: '{content}'")
                chunks_received += 1
        
        print(f"✅ 流式测试成功！共收到 {chunks_received} 个数据块")
        
    except Exception as e:
        print(f"❌ 流式测试失败: {e}")
        return False
    
    print(f"\n4️⃣ 测试错误处理...")
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
        success = await test_deepseek_connection()
        
        print("\n" + "=" * 60)
        if success:
            print("🎉 所有测试通过！DeepSeek API配置正确")
            print("✅ 可以继续进行Provider系统测试")
        else:
            print("❌ 测试失败！请检查API配置")
            print("💡 建议:")
            print("   1. 验证API Key是否有效")
            print("   2. 检查Base URL是否正确")
            print("   3. 确认模型名称是否支持")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 测试过程中发生严重错误: {e}")

if __name__ == "__main__":
    asyncio.run(main())