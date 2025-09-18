"""
汇率获取工具
"""
import asyncio
import aiohttp
import json
import time
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class ExchangeRateService:
    """汇率服务单例类"""
    
    _instance: Optional['ExchangeRateService'] = None
    _usd_to_cny_rate: float = 7.2  # 默认汇率
    _last_update_time: float = 0
    _update_interval: float = 3600  # 1小时更新一次
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialized = True
            # 同步初始化汇率（从缓存读取）
            self._initialize_rate_sync()
    
    def _initialize_rate_sync(self):
        """同步初始化汇率（仅从缓存读取）"""
        try:
            # 尝试从缓存文件读取
            try:
                with open('cache/exchange_rate.json', 'r') as f:
                    data = json.load(f)
                    cached_rate = data.get('rate')
                    cached_time = data.get('timestamp', 0)
                    
                    # 检查缓存是否过期
                    if cached_rate and (time.time() - cached_time) < self._update_interval:
                        self._usd_to_cny_rate = cached_rate
                        self._last_update_time = cached_time
                        logger.info(f"从缓存加载汇率: 1 USD = {self._usd_to_cny_rate} CNY")
                        return
            except (FileNotFoundError, json.JSONDecodeError):
                pass
            
            logger.info(f"使用默认汇率: 1 USD = {self._usd_to_cny_rate} CNY")
            
        except Exception as e:
            logger.warning(f"初始化汇率失败，使用默认汇率 {self._usd_to_cny_rate}: {e}")

    async def _initialize_rate(self):
        """异步初始化汇率"""
        try:
            # 尝试从缓存文件读取
            try:
                with open('cache/exchange_rate.json', 'r') as f:
                    data = json.load(f)
                    cached_rate = data.get('rate')
                    cached_time = data.get('timestamp', 0)
                    
                    # 检查缓存是否过期
                    if cached_rate and (time.time() - cached_time) < self._update_interval:
                        self._usd_to_cny_rate = cached_rate
                        self._last_update_time = cached_time
                        logger.info(f"从缓存加载汇率: 1 USD = {self._usd_to_cny_rate} CNY")
                        return
            except (FileNotFoundError, json.JSONDecodeError):
                pass
            
            # 获取最新汇率
            await self._fetch_latest_rate()
            
        except Exception as e:
            logger.warning(f"初始化汇率失败，使用默认汇率 {self._usd_to_cny_rate}: {e}")
    
    async def _fetch_latest_rate(self) -> None:
        """获取最新汇率"""
        apis = [
            'https://api.exchangerate-api.com/v4/latest/USD',
            'https://open.er-api.com/v6/latest/USD',
            'https://api.fxratesapi.com/latest?base=USD&symbols=CNY'
        ]
        
        for api_url in apis:
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                    async with session.get(api_url) as response:
                        if response.status == 200:
                            data = await response.json()
                            
                            # 不同API的响应格式可能不同
                            cny_rate = None
                            if 'rates' in data and 'CNY' in data['rates']:
                                cny_rate = data['rates']['CNY']
                            elif 'CNY' in data:
                                cny_rate = data['CNY']
                            
                            if cny_rate and isinstance(cny_rate, (int, float)) and cny_rate > 0:
                                self._usd_to_cny_rate = float(cny_rate)
                                self._last_update_time = time.time()
                                
                                # 缓存到文件
                                await self._cache_rate()
                                
                                logger.info(f"汇率更新成功 (API: {api_url}): 1 USD = {self._usd_to_cny_rate} CNY")
                                return
                                
            except Exception as e:
                logger.warning(f"汇率API {api_url} 请求失败: {e}")
                continue
        
        logger.warning(f"所有汇率API都失败，使用当前汇率: {self._usd_to_cny_rate}")
    
    async def _cache_rate(self):
        """缓存汇率到文件"""
        try:
            import os
            os.makedirs('cache', exist_ok=True)
            
            cache_data = {
                'rate': self._usd_to_cny_rate,
                'timestamp': self._last_update_time
            }
            
            with open('cache/exchange_rate.json', 'w') as f:
                json.dump(cache_data, f)
                
        except Exception as e:
            logger.warning(f"缓存汇率失败: {e}")
    
    async def get_usd_to_cny_rate(self) -> float:
        """获取USD到CNY的汇率"""
        # 检查是否需要更新
        current_time = time.time()
        if current_time - self._last_update_time > self._update_interval:
            await self._fetch_latest_rate()
        
        return self._usd_to_cny_rate
    
    def get_current_rate(self) -> float:
        """获取当前汇率（同步方法）"""
        return self._usd_to_cny_rate
    
    async def force_update(self) -> float:
        """强制更新汇率"""
        await self._fetch_latest_rate()
        return self._usd_to_cny_rate

# 全局实例
_exchange_rate_service = ExchangeRateService()

# 便捷函数
async def get_usd_to_cny_rate() -> float:
    """获取USD到CNY汇率"""
    return await _exchange_rate_service.get_usd_to_cny_rate()

def get_current_usd_to_cny_rate() -> float:
    """获取当前USD到CNY汇率（同步）"""
    return _exchange_rate_service.get_current_rate()

async def update_exchange_rate() -> float:
    """更新汇率"""
    return await _exchange_rate_service.force_update()