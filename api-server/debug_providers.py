#!/usr/bin/env python3
"""
Provider管理器调试脚本

检查环境变量传递和Provider配置问题
"""

import os
from providers import ProviderManager, ProviderConfig, ProviderType

print("=" * 60)
print("🔍 Provider管理器调试")
print("=" * 60)

# 1. 检查环境变量
print("\n1️⃣ 检查环境变量:")
print(f"   OPENAI_API_KEY: {os.getenv('OPENAI_API_KEY', 'None')}")
print(f"   OPENAI_BASE_URL: {os.getenv('OPENAI_BASE_URL', 'None')}")
print(f"   OPENAI_DEFAULT_MODEL: {os.getenv('OPENAI_DEFAULT_MODEL', 'None')}")
print(f"   OPENROUTER_API_KEY: {os.getenv('OPENROUTER_API_KEY', 'None')}")

# 2. 创建Provider管理器
print("\n2️⃣ 创建Provider管理器:")
manager = ProviderManager()

print(f"   注册的Provider数量: {manager.provider_count}")
print(f"   Provider名称列表: {manager.provider_names}")
print(f"   默认Provider: {manager.default_provider_name}")

# 3. 检查每个Provider的详细配置
print("\n3️⃣ 检查Provider详细配置:")
for name in manager.provider_names:
    provider = manager.get_provider(name)
    if provider:
        print(f"\n   📋 Provider: {name}")
        print(f"      类型: {provider.provider_type.value}")
        print(f"      API Key: {provider.config.api_key[:20]}..." if provider.config.api_key else "None")
        print(f"      Base URL: {provider.config.base_url}")
        print(f"      默认模型: {provider.config.default_model}")
        print(f"      额外头部: {provider.config.extra_headers}")
        print(f"      超时时间: {provider.config.timeout}")

# 4. 测试get_provider_info方法
print("\n4️⃣ 测试get_provider_info方法:")
provider_info = manager.get_provider_info()
print(f"   返回的Provider信息:")
for name, info in provider_info.items():
    print(f"   📋 {name}:")
    for key, value in info.items():
        print(f"      {key}: {value}")

# 5. 手动测试OpenAI Provider创建
print("\n5️⃣ 手动测试OpenAI Provider创建:")
try:
    openai_key = os.getenv("OPENAI_API_KEY")
    openai_base_url = os.getenv("OPENAI_BASE_URL")
    openai_default_model = os.getenv("OPENAI_DEFAULT_MODEL")
    
    print(f"   读取的环境变量:")
    print(f"      KEY: {openai_key}")
    print(f"      BASE_URL: {openai_base_url}")
    print(f"      MODEL: {openai_default_model}")
    
    if openai_key:
        config = ProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key=openai_key,
            base_url=openai_base_url,
            default_model=openai_default_model or "deepseek-chat"
        )
        print(f"   创建的配置:")
        print(f"      类型: {config.provider_type}")
        print(f"      API Key: {config.api_key[:20]}...")
        print(f"      Base URL: {config.base_url}")
        print(f"      默认模型: {config.default_model}")
        
except Exception as e:
    print(f"   ❌ 创建失败: {e}")

print("\n" + "=" * 60)
print("🏁 调试完成")
print("=" * 60)