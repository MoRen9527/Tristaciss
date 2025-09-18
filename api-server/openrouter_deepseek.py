import requests
import json

# 替换为你的 OpenRouter API Key
API_KEY = "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"

# 选择模型 ID（例如 DeepSeek R1 0528 或 V3 0324 的免费版本）
MODEL_ID = "deepseek/deepseek-r1-0528:free"  # 或 "deepseek/deepseek-chat-v3-0324:free"

# OpenRouter API 地址
API_URL = "https://openrouter.ai/api/v1/chat/completions" 

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def query_deepseek(prompt):
    payload = {
        "model": MODEL_ID,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,  # 控制生成文本的随机性
        "max_tokens": 1000   # 根据模型最大上下文调整（如 163840）
    }

    response = requests.post(API_URL, headers=headers, data=json.dumps(payload))
    
    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        raise Exception(f"API 请求失败: {response.status_code} - {response.text}")

# 示例调用
if __name__ == "__main__":
    try:
        result = query_deepseek("请解释量子计算的基本原理。")
        print("模型输出:", result)
    except Exception as e:
        print("错误信息:", e)