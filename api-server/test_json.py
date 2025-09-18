import json

# 测试数据
data = {
    "success": True,
    "providers": {"openai": {"name": "OpenAI"}}
}

print("JSON:", json.dumps(data))