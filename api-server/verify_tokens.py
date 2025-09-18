"""
Token验证端点

提供API端点来验证token统计的正确性
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# 创建验证路由
verify_router = APIRouter(prefix="/api/verify", tags=["verification"])

# 存储API调用记录
api_call_logs = []

def log_api_call(provider: str, model: str, input_text: str, output_text: str, 
                estimated_input_tokens: int, estimated_output_tokens: int,
                actual_response_time: float):
    """记录API调用信息"""
    call_log = {
        "timestamp": datetime.now().isoformat(),
        "provider": provider,
        "model": model,
        "input_text_length": len(input_text),
        "output_text_length": len(output_text),
        "estimated_input_tokens": estimated_input_tokens,
        "estimated_output_tokens": estimated_output_tokens,
        "actual_response_time": actual_response_time,
        "input_text_preview": input_text[:100] + "..." if len(input_text) > 100 else input_text,
        "output_text_preview": output_text[:100] + "..." if len(output_text) > 100 else output_text
    }
    
    api_call_logs.append(call_log)
    
    # 只保留最近50条记录
    if len(api_call_logs) > 50:
        api_call_logs.pop(0)
    
    logger.info(f"🔍 Token验证记录: {json.dumps(call_log, ensure_ascii=False)}")

@verify_router.get("/token-logs")
async def get_token_logs():
    """获取token验证日志"""
    return JSONResponse({
        "total_calls": len(api_call_logs),
        "recent_calls": api_call_logs[-10:],  # 最近10条
        "verification_guide": {
            "如何验证token正确性": [
                "1. 查看后端日志中的'Token验证记录'",
                "2. 对比前端显示的token数量与后端记录的估算值",
                "3. 检查响应时间是否与实际API调用时间一致",
                "4. 验证费用计算是否基于正确的模型价格"
            ],
            "token估算逻辑": {
                "中文": "约2字符/token",
                "英文": "约4字符/token",
                "说明": "这是粗略估算，实际token数量可能有差异"
            },
            "费用计算": {
                "DeepSeek": {
                    "输入": "¥0.0014/1K tokens",
                    "输出": "¥0.0028/1K tokens"
                },
                "说明": "费用基于官方价格计算"
            }
        }
    })

@verify_router.get("/latest-call")
async def get_latest_call():
    """获取最新的API调用记录"""
    if not api_call_logs:
        return JSONResponse({"message": "暂无API调用记录"})
    
    latest = api_call_logs[-1]
    return JSONResponse({
        "latest_call": latest,
        "verification_details": {
            "输入文本长度": latest["input_text_length"],
            "输出文本长度": latest["output_text_length"],
            "估算输入tokens": latest["estimated_input_tokens"],
            "估算输出tokens": latest["estimated_output_tokens"],
            "实际响应时间": f"{latest['actual_response_time']:.3f}秒",
            "token估算准确性": "基于字符长度的粗略估算，与实际API返回可能有10-20%差异"
        }
    })

@verify_router.post("/clear-logs")
async def clear_logs():
    """清空验证日志"""
    global api_call_logs
    api_call_logs.clear()
    return JSONResponse({"message": "验证日志已清空"})