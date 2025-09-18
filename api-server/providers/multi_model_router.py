"""
多模型路由器

支持多模型并发、负载均衡和故障转移
"""

import asyncio
import random
import time
from typing import Dict, List, Optional, AsyncGenerator, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

from .base import BaseModelProvider, StreamChunk, ProviderError

logger = logging.getLogger(__name__)

class RoutingStrategy(str, Enum):
    """路由策略"""
    ROUND_ROBIN = "round_robin"      # 轮询
    RANDOM = "random"                # 随机
    LEAST_USED = "least_used"        # 最少使用
    FASTEST_FIRST = "fastest_first"  # 最快优先
    FAILOVER = "failover"            # 故障转移

@dataclass
class ModelStats:
    """模型统计信息"""
    model_id: str
    provider_name: str
    request_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    total_response_time: float = 0.0
    last_used: float = 0.0
    is_available: bool = True
    
    @property
    def success_rate(self) -> float:
        """成功率"""
        if self.request_count == 0:
            return 1.0
        return self.success_count / self.request_count
        
    @property
    def average_response_time(self) -> float:
        """平均响应时间"""
        if self.success_count == 0:
            return float('inf')
        return self.total_response_time / self.success_count

class MultiModelRouter:
    """多模型路由器"""
    
    def __init__(
        self,
        providers: Dict[str, BaseModelProvider],
        enabled_models: List[str],
        strategy: RoutingStrategy = RoutingStrategy.ROUND_ROBIN,
        max_retries: int = 3,
        timeout_per_model: float = 30.0
    ):
        """
        初始化多模型路由器
        
        Args:
            providers: 提供商字典
            enabled_models: 启用的模型列表
            strategy: 路由策略
            max_retries: 最大重试次数
            timeout_per_model: 每个模型的超时时间
        """
        self.providers = providers
        self.enabled_models = enabled_models
        self.strategy = strategy
        self.max_retries = max_retries
        self.timeout_per_model = timeout_per_model
        
        # 模型统计信息
        self.model_stats: Dict[str, ModelStats] = {}
        for model_id in enabled_models:
            provider_name = self._get_provider_for_model(model_id)
            if provider_name:
                self.model_stats[model_id] = ModelStats(
                    model_id=model_id,
                    provider_name=provider_name
                )
        
        # 轮询索引
        self._round_robin_index = 0
        
    def _get_provider_for_model(self, model_id: str) -> Optional[str]:
        """根据模型ID获取对应的提供商名称"""
        # 根据模型ID前缀判断提供商
        if model_id.startswith('deepseek/') or model_id.startswith('qwen/') or '/' in model_id:
            # OpenRouter模型
            if 'openrouter_official' in self.providers:
                return 'openrouter_official'
            elif 'openrouter' in self.providers:
                return 'openrouter'
        elif model_id.startswith('gpt-'):
            return 'openai'
        elif model_id.startswith('glm-'):
            return 'glm'
            
        # 默认返回第一个可用的提供商
        return next(iter(self.providers.keys())) if self.providers else None
        
    def _select_model(self) -> Optional[str]:
        """根据策略选择模型"""
        available_models = [
            model_id for model_id in self.enabled_models
            if self.model_stats.get(model_id, ModelStats("", "")).is_available
        ]
        
        if not available_models:
            return None
            
        if self.strategy == RoutingStrategy.ROUND_ROBIN:
            model = available_models[self._round_robin_index % len(available_models)]
            self._round_robin_index += 1
            return model
            
        elif self.strategy == RoutingStrategy.RANDOM:
            return random.choice(available_models)
            
        elif self.strategy == RoutingStrategy.LEAST_USED:
            return min(
                available_models,
                key=lambda m: self.model_stats.get(m, ModelStats("", "")).request_count
            )
            
        elif self.strategy == RoutingStrategy.FASTEST_FIRST:
            return min(
                available_models,
                key=lambda m: self.model_stats.get(m, ModelStats("", "")).average_response_time
            )
            
        elif self.strategy == RoutingStrategy.FAILOVER:
            # 按成功率排序，选择最可靠的
            return max(
                available_models,
                key=lambda m: self.model_stats.get(m, ModelStats("", "")).success_rate
            )
            
        return available_models[0]
        
    def _update_stats(
        self,
        model_id: str,
        success: bool,
        response_time: float = 0.0
    ):
        """更新模型统计信息"""
        if model_id not in self.model_stats:
            return
            
        stats = self.model_stats[model_id]
        stats.request_count += 1
        stats.last_used = time.time()
        
        if success:
            stats.success_count += 1
            stats.total_response_time += response_time
        else:
            stats.failure_count += 1
            
        # 如果连续失败次数过多，标记为不可用
        if stats.failure_count >= 3 and stats.success_rate < 0.5:
            stats.is_available = False
            logger.warning(f"模型 {model_id} 被标记为不可用，成功率: {stats.success_rate:.2f}")
            
    async def _make_request(
        self,
        model_id: str,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> AsyncGenerator[StreamChunk, None]:
        """向指定模型发起请求"""
        provider_name = self._get_provider_for_model(model_id)
        if not provider_name or provider_name not in self.providers:
            raise ProviderError(f"模型 {model_id} 没有对应的提供商", "router")
            
        provider = self.providers[provider_name]
        start_time = time.time()
        
        try:
            # 设置模型ID
            if hasattr(provider, 'set_model'):
                provider.set_model(model_id)
                
            # 执行请求
            async for chunk in provider.chat_completion(
                messages=messages,
                model=model_id,
                **kwargs
            ):
                yield chunk
                
            # 更新成功统计
            response_time = time.time() - start_time
            self._update_stats(model_id, True, response_time)
            
        except Exception as e:
            # 更新失败统计
            self._update_stats(model_id, False)
            raise e
            
    async def route_request(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        路由请求到最佳模型
        
        Args:
            messages: 对话消息
            **kwargs: 其他参数
            
        Yields:
            StreamChunk: 流式响应块
            
        Raises:
            ProviderError: 所有模型都不可用时抛出
        """
        last_error = None
        
        for attempt in range(self.max_retries):
            model_id = self._select_model()
            if not model_id:
                break
                
            logger.info(f"路由请求到模型: {model_id} (尝试 {attempt + 1}/{self.max_retries})")
            
            try:
                async with asyncio.timeout(self.timeout_per_model):
                    async for chunk in self._make_request(model_id, messages, **kwargs):
                        yield chunk
                return  # 成功完成，退出重试循环
                
            except asyncio.TimeoutError:
                last_error = ProviderError(f"模型 {model_id} 请求超时", "router")
                logger.warning(f"模型 {model_id} 请求超时")
                
            except Exception as e:
                last_error = e
                logger.warning(f"模型 {model_id} 请求失败: {e}")
                
            # 如果不是最后一次尝试，等待一段时间再重试
            if attempt < self.max_retries - 1:
                await asyncio.sleep(1.0)
                
        # 所有重试都失败了
        if last_error:
            raise last_error
        else:
            raise ProviderError("没有可用的模型", "router")
            
    async def concurrent_request(
        self,
        messages: List[Dict[str, str]],
        model_count: int = 2,
        **kwargs
    ) -> AsyncGenerator[Tuple[str, StreamChunk], None]:
        """
        并发请求多个模型
        
        Args:
            messages: 对话消息
            model_count: 并发模型数量
            **kwargs: 其他参数
            
        Yields:
            Tuple[str, StreamChunk]: (模型ID, 响应块)
        """
        available_models = [
            model_id for model_id in self.enabled_models
            if self.model_stats.get(model_id, ModelStats("", "")).is_available
        ]
        
        if not available_models:
            raise ProviderError("没有可用的模型", "router")
            
        # 选择要并发的模型
        selected_models = available_models[:model_count]
        
        # 创建并发任务
        tasks = []
        for model_id in selected_models:
            task = asyncio.create_task(
                self._collect_response(model_id, messages, **kwargs)
            )
            tasks.append((model_id, task))
            
        # 处理并发响应
        try:
            async for model_id, chunk in self._merge_concurrent_responses(tasks):
                yield model_id, chunk
        finally:
            # 取消未完成的任务
            for model_id, task in tasks:
                if not task.done():
                    task.cancel()
                    
    async def _collect_response(
        self,
        model_id: str,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> List[StreamChunk]:
        """收集单个模型的完整响应"""
        chunks = []
        try:
            async for chunk in self._make_request(model_id, messages, **kwargs):
                chunks.append(chunk)
        except Exception as e:
            logger.error(f"模型 {model_id} 并发请求失败: {e}")
            
        return chunks
        
    async def _merge_concurrent_responses(
        self,
        tasks: List[Tuple[str, asyncio.Task]]
    ) -> AsyncGenerator[Tuple[str, StreamChunk], None]:
        """合并并发响应"""
        # 等待所有任务完成
        for model_id, task in tasks:
            try:
                chunks = await task
                for chunk in chunks:
                    yield model_id, chunk
            except Exception as e:
                logger.error(f"模型 {model_id} 任务失败: {e}")
                
    def get_model_stats(self) -> Dict[str, Dict[str, Any]]:
        """获取模型统计信息"""
        stats = {}
        for model_id, model_stats in self.model_stats.items():
            stats[model_id] = {
                "provider": model_stats.provider_name,
                "request_count": model_stats.request_count,
                "success_count": model_stats.success_count,
                "failure_count": model_stats.failure_count,
                "success_rate": model_stats.success_rate,
                "average_response_time": model_stats.average_response_time,
                "last_used": model_stats.last_used,
                "is_available": model_stats.is_available
            }
        return stats
        
    def reset_model_availability(self, model_id: Optional[str] = None):
        """重置模型可用性状态"""
        if model_id:
            if model_id in self.model_stats:
                self.model_stats[model_id].is_available = True
                logger.info(f"重置模型 {model_id} 可用性状态")
        else:
            for stats in self.model_stats.values():
                stats.is_available = True
            logger.info("重置所有模型可用性状态")
            
    def update_enabled_models(self, enabled_models: List[str]):
        """更新启用的模型列表"""
        self.enabled_models = enabled_models
        
        # 添加新模型的统计信息
        for model_id in enabled_models:
            if model_id not in self.model_stats:
                provider_name = self._get_provider_for_model(model_id)
                if provider_name:
                    self.model_stats[model_id] = ModelStats(
                        model_id=model_id,
                        provider_name=provider_name
                    )
                    
        # 移除不再启用的模型统计
        disabled_models = set(self.model_stats.keys()) - set(enabled_models)
        for model_id in disabled_models:
            del self.model_stats[model_id]
            
        logger.info(f"更新启用模型列表: {enabled_models}")
        
    def set_routing_strategy(self, strategy: RoutingStrategy):
        """设置路由策略"""
        self.strategy = strategy
        logger.info(f"设置路由策略: {strategy.value}")