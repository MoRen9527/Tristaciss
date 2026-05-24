#!/usr/bin/env python3
"""
测试新添加的OpenRouter免费模型
验证模型可用性和响应质量
"""

import asyncio
import aiohttp
import json
import os
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).with_name(".env"))

# 新添加的免费模型列表
NEW_FREE_MODELS = [
    "deepseek/deepseek-chat-v3.1:free",
    "deepseek/deepseek-chat-v3-0324:free", 
    "openai/gpt-oss-120b:free",
    "openai/gpt-oss-20b:free",
    "z-ai/glm-4.5-air:free",
    "moonshotai/kimi-k2:free",
    "moonshotai/kimi-dev-72b:free",
    "qwen/qwen2.5-vl-32b-instruct:free"
]

# 测试消息
TEST_MESSAGE = "请用中文简单介绍一下你自己，包括你的能力和特点。"


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"缺少环境变量 {name}，请先在 api-server/.env 或当前 shell 中配置")
    return value


def load_config() -> dict:
    return {
        "api_key": require_env("OPENROUTER_API_KEY"),
        "base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip() or "https://openrouter.ai/api/v1",
    }

async def test_model(session, base_url, api_key, model_name):
    """测试单个模型"""
    url = f"{base_url.rstrip('/')}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tristaciss-platform.com",
        "X-Title": "Tristaciss Platform - Model Test"
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": TEST_MESSAGE}
        ],
        "max_tokens": 200,
        "temperature": 0.7
    }
    
    start_time = time.time()
    
    try:
        async with session.post(url, headers=headers, json=payload, timeout=30) as response:
            response_time = time.time() - start_time
            
            if response.status == 200:
                data = await response.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                return {
                    'model': model_name,
                    'status': 'success',
                    'response_time': round(response_time, 2),
                    'content': content[:100] + '...' if len(content) > 100 else content,
                    'full_response': data
                }
            else:
                error_text = await response.text()
                return {
                    'model': model_name,
                    'status': 'error',
                    'response_time': round(response_time, 2),
                    'error': f"HTTP {response.status}: {error_text}"
                }
                
    except asyncio.TimeoutError:
        return {
            'model': model_name,
            'status': 'timeout',
            'response_time': 30.0,
            'error': 'Request timeout after 30 seconds'
        }
    except Exception as e:
        return {
            'model': model_name,
            'status': 'exception',
            'response_time': time.time() - start_time,
            'error': str(e)
        }

async def main():
    """主测试函数"""
    try:
        config = load_config()
    except RuntimeError as e:
        print(f"❌ 配置错误: {e}")
        raise SystemExit(1) from e
    
    print(f"🚀 开始测试 {len(NEW_FREE_MODELS)} 个新添加的免费模型")
    print(f"📅 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🔑 API Key: [已通过环境变量加载]")
    print(f"🌐 Base URL: {config['base_url']}")
    print("=" * 80)
    
    results = []
    
    async with aiohttp.ClientSession() as session:
        # 并发测试所有模型
        tasks = [test_model(session, config['base_url'], config['api_key'], model) for model in NEW_FREE_MODELS]
        results = await asyncio.gather(*tasks)
    
    # 统计结果
    success_count = sum(1 for r in results if r['status'] == 'success')
    error_count = len(results) - success_count
    
    print(f"\n📊 测试结果统计:")
    print(f"✅ 成功: {success_count}/{len(NEW_FREE_MODELS)}")
    print(f"❌ 失败: {error_count}/{len(NEW_FREE_MODELS)}")
    print("=" * 80)
    
    # 详细结果
    for result in results:
        status_icon = "✅" if result['status'] == 'success' else "❌"
        print(f"\n{status_icon} {result['model']}")
        print(f"   状态: {result['status']}")
        print(f"   响应时间: {result['response_time']}秒")
        
        if result['status'] == 'success':
            print(f"   响应内容: {result['content']}")
        else:
            print(f"   错误信息: {result['error']}")
    
    # 保存详细结果到文件
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"test_results_new_free_models_{timestamp}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump({
            'test_time': datetime.now().isoformat(),
            'total_models': len(NEW_FREE_MODELS),
            'success_count': success_count,
            'error_count': error_count,
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 详细结果已保存到: {filename}")
    
    # 推荐可用模型
    successful_models = [r['model'] for r in results if r['status'] == 'success']
    if successful_models:
        print(f"\n🎯 推荐使用的可用免费模型:")
        for model in successful_models:
            print(f"   • {model}")
    
    print(f"\n🏁 测试完成!")

if __name__ == "__main__":
    asyncio.run(main())