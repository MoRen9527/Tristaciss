"""
汇率API端点
"""
from fastapi import APIRouter, HTTPException
from utils.exchange_rate import get_usd_to_cny_rate, get_current_usd_to_cny_rate, update_exchange_rate
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/api/exchange-rate", tags=["汇率"], summary="获取当前USD到CNY汇率")
async def get_exchange_rate():
    """获取当前USD到CNY汇率"""
    try:
        rate = await get_usd_to_cny_rate()
        return {
            "success": True,
            "rate": rate,
            "currency_pair": "USD/CNY",
            "timestamp": int(__import__('time').time())
        }
    except Exception as e:
        logger.error(f"获取汇率失败: {e}")
        # 返回当前缓存的汇率
        current_rate = get_current_usd_to_cny_rate()
        return {
            "success": False,
            "rate": current_rate,
            "currency_pair": "USD/CNY",
            "timestamp": int(__import__('time').time()),
            "error": "使用缓存汇率",
            "message": str(e)
        }

@router.post("/api/exchange-rate/update", tags=["汇率"], summary="强制更新汇率")
async def force_update_exchange_rate():
    """强制更新汇率"""
    try:
        rate = await update_exchange_rate()
        return {
            "success": True,
            "rate": rate,
            "currency_pair": "USD/CNY",
            "timestamp": int(__import__('time').time()),
            "message": "汇率更新成功"
        }
    except Exception as e:
        logger.error(f"强制更新汇率失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新汇率失败: {str(e)}")

@router.get("/api/exchange-rate/current", tags=["汇率"], summary="获取当前缓存的汇率（同步）")
async def get_current_exchange_rate():
    """获取当前缓存的汇率（同步，不触发更新）"""
    try:
        rate = get_current_usd_to_cny_rate()
        return {
            "success": True,
            "rate": rate,
            "currency_pair": "USD/CNY",
            "timestamp": int(__import__('time').time()),
            "source": "cache"
        }
    except Exception as e:
        logger.error(f"获取缓存汇率失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取汇率失败: {str(e)}")