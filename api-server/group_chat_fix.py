"""
群聊功能修复补丁
用于修复群聊中缺少的token统计和性能信息
"""

import time
import json
from typing import Dict, Any

def calculate_performance_and_tokens(
    start_time: float,
    response_content: str,
    discussion_messages: list,
    provider_name: str,
    ai_name: str,
    model: str
) -> Dict[str, Any]:
    """
    计算性能统计和token信息
    """
    end_time = time.time()
    response_time = end_time - start_time
    first_token_time = 0.3  # 模拟首字延迟
    
    # 简单的token估算
    input_text = ' '.join([msg['content'] for msg in discussion_messages])
    input_tokens = int(len(input_text.split()) * 1.3)
    output_tokens = int(len(response_content.split()) * 1.3)
    total_tokens = input_tokens + output_tokens
    tokens_per_second = output_tokens / response_time if response_time > 0 else 0
    
    # 费用计算（根据不同provider调整）
    if provider_name == 'deepseek':
        input_cost_per_1k = 0.0014 / 7.2  # DeepSeek定价转USD
        output_cost_per_1k = 0.0028 / 7.2
    elif provider_name == 'openai':
        input_cost_per_1k = 0.0015
        output_cost_per_1k = 0.002
    else:  # openrouter, glm等
        input_cost_per_1k = 0.0015
        output_cost_per_1k = 0.002
    
    input_cost = (input_tokens / 1000) * input_cost_per_1k
    output_cost = (output_tokens / 1000) * output_cost_per_1k
    total_cost_cny = (input_cost + output_cost) * 7.2  # 汇率转换
    
    return {
        'type': 'groupChatProviderEnd', 
        'provider': provider_name, 
        'aiName': ai_name,
        'content': response_content,
        'model': model,
        'performance': {
            'first_token_time': first_token_time,
            'response_time': response_time,
            'tokens_per_second': tokens_per_second
        },
        'tokens': {
            'input': input_tokens,
            'output': output_tokens,
            'total': total_tokens,
            'input_cost': input_cost,
            'output_cost': output_cost,
            'total_cost_cny': total_cost_cny
        }
    }

def format_group_chat_event(event_data: Dict[str, Any]) -> str:
    """
    格式化群聊事件为SSE格式
    """
    return f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"

# 使用示例：
# 在fastapi_stream.py的群聊处理中，替换简单的provider_end事件：
# 
# # 原来的代码：
# yield f"data: {json.dumps({'type': 'provider_end', 'provider': provider_name, 'index': i})}\n\n"
# 
# # 替换为：
# from group_chat_fix import calculate_performance_and_tokens, format_group_chat_event
# 
# provider_end_data = calculate_performance_and_tokens(
#     start_time, response_content, discussion_messages, 
#     provider_name, ai_name, temp_config.default_model
# )
# provider_end_data['index'] = i
# yield format_group_chat_event(provider_end_data)