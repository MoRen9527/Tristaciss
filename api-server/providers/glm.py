"""
智谱GLM API Provider实现

使用OpenAI兼容接口调用智谱GLM模型
"""

import time
import uuid
import asyncio
from typing import Dict, List, Any, Optional, AsyncGenerator
import logging

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletion, ChatCompletionChunk

from .base import (
    BaseModelProvider, ProviderConfig, ProviderType, ModelInfo,
    StreamChunk, ProviderError, ProviderConnectionError, 
    ProviderAuthenticationError, ProviderRateLimitError,
    ProviderModelNotFoundError
)

logger = logging.getLogger(__name__)

class GLMProvider(BaseModelProvider):
    """智谱GLM API提供商实现"""
    
    def __init__(self, config: ProviderConfig):
        """初始化GLM提供商"""
        super().__init__(config)
        
        # 设置默认base_url
        if not self.config.base_url:
            self.config.base_url = "https://open.bigmodel.cn/api/paas/v4"
            
        # 初始化OpenAI客户端
        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout
        )
        
        # GLM预定义模型信息
        self._predefined_models = {
            "glm-4.5": ModelInfo(
                id="glm-4.5",
                name="GLM-4.5",
                provider="智谱AI",
                max_context_length=128000,
                max_input_tokens=120000,
                max_output_tokens=4096,
                input_price_per_1k=0.001,
                output_price_per_1k=0.001,
                supports_streaming=True
            ),
            "glm-4.5-flash": ModelInfo(
                id="glm-4.5-flash",
                name="GLM-4.5 Flash",
                provider="智谱AI",
                max_context_length=128000,
                max_input_tokens=120000,
                max_output_tokens=4096,
                input_price_per_1k=0.001,
                output_price_per_1k=0.001,
                supports_streaming=True
            ),
            "glm-4": ModelInfo(
                id="glm-4",
                name="GLM-4",
                provider="智谱AI",
                max_context_length=128000,
                max_input_tokens=120000,
                max_output_tokens=4096,
                input_price_per_1k=0.01,
                output_price_per_1k=0.02,
                supports_streaming=True
            ),
            "glm-3-turbo": ModelInfo(
                id="glm-3-turbo",
                name="GLM-3-Turbo",
                provider="智谱AI",
                max_context_length=32000,
                max_input_tokens=28000,
                max_output_tokens=4096,
                input_price_per_1k=0.005,
                output_price_per_1k=0.005,
                supports_streaming=True
            )
        }
        
    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """转换消息格式为GLM标准格式"""
        converted = []
        for msg in messages:
            if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                converted.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
            else:
                logger.warning(f"消息格式不正确: {msg}")
                
        return converted
        
    def _handle_glm_error(self, error: Exception) -> ProviderError:
        """处理GLM API错误"""
        error_msg = str(error)
        
        if "authentication" in error_msg.lower() or "api_key" in error_msg.lower():
            return ProviderAuthenticationError(
                "API密钥无效或已过期", 
                self.provider_name
            )
        elif "rate_limit" in error_msg.lower() or "quota" in error_msg.lower():
            return ProviderRateLimitError(
                "请求频率超限或配额不足", 
                self.provider_name
            )
        elif "model" in error_msg.lower() and "not found" in error_msg.lower():
            return ProviderModelNotFoundError(
                "指定的模型不存在", 
                self.provider_name
            )
        elif "connection" in error_msg.lower() or "timeout" in error_msg.lower():
            return ProviderConnectionError(
                f"连接错误: {error_msg}", 
                self.provider_name
            )
        else:
            return ProviderError(error_msg, self.provider_name)
            
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        stream: bool = True,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> AsyncGenerator[StreamChunk, None]:
        """执行聊天完成请求"""
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        chunk_count = 0
        
        logger.info(f"GLM请求 - ID: {request_id}, 模型: {model}, 流式: {stream}")
        
        try:
            # 转换消息格式
            converted_messages = self._convert_messages(messages)
            
            # 构建请求参数
            request_params = {
                "model": model,
                "messages": converted_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": stream
            }
            
            # 添加其他参数
            for key, value in kwargs.items():
                if key not in ['messages', 'model', 'stream', 'temperature', 'max_tokens']:
                    request_params[key] = value
            
            if stream:
                # 流式响应
                response = await self.client.chat.completions.create(**request_params)
                
                async for chunk in response:
                    if chunk.choices and len(chunk.choices) > 0:
                        choice = chunk.choices[0]
                        
                        if choice.delta and choice.delta.content:
                            chunk_count += 1
                            
                            yield StreamChunk(
                                content=choice.delta.content,
                                chunk_id=chunk_count,
                                request_id=request_id,
                                timestamp=time.time(),
                                model=model,
                                provider=self.provider_name
                            )
                            
                        # 检查完成状态
                        if choice.finish_reason is not None:
                            logger.info(f"GLM完成 - 原因: {choice.finish_reason}")
                            return
            else:
                # 非流式响应
                response = await self.client.chat.completions.create(**request_params)
                
                if response.choices and len(response.choices) > 0:
                    content = response.choices[0].message.content
                    
                    # 提取usage信息
                    usage_info = None
                    if hasattr(response, 'usage') and response.usage:
                        usage_info = {
                            "prompt_tokens": response.usage.prompt_tokens,
                            "completion_tokens": response.usage.completion_tokens,
                            "total_tokens": response.usage.total_tokens
                        }
                    
                    yield StreamChunk(
                        content=content,
                        chunk_id=1,
                        request_id=request_id,
                        timestamp=time.time(),
                        model=model,
                        provider=self.provider_name,
                        usage=usage_info
                    )
                    
        except Exception as e:
            logger.error(f"GLM请求错误: {e}")
            raise self._handle_glm_error(e)
            
    def validate_config(self) -> bool:
        """验证配置是否有效"""
        if not self.config.api_key:
            raise ProviderError("API密钥不能为空", self.provider_name)
            
        return True
        
    async def get_supported_models(self) -> List[ModelInfo]:
        """获取支持的模型列表"""
        if self._models_cache is not None:
            return self._models_cache
            
        try:
            # 从GLM API获取模型列表
            models_response = await self.client.models.list()
            
            available_models = []
            for model in models_response.data:
                if model.id in self._predefined_models:
                    available_models.append(self._predefined_models[model.id])
                else:
                    # 为未知模型创建基本信息
                    available_models.append(ModelInfo(
                        id=model.id,
                        name=model.id,
                        provider="智谱AI",
                        max_context_length=4096,  # 默认值
                        max_input_tokens=3000,
                        max_output_tokens=1000,
                        input_price_per_1k=0.01,  # 默认价格
                        output_price_per_1k=0.01,
                        supports_streaming=True
                    ))
                    
            self._models_cache = available_models
            return self._models_cache
            
        except Exception as e:
            logger.warning(f"获取GLM模型列表失败，使用预定义列表: {e}")
            # 如果API调用失败，返回预定义的模型列表
            self._models_cache = list(self._predefined_models.values())
            return self._models_cache
            
    async def test_connection(self) -> bool:
        """测试连接是否正常"""
        try:
            # 获取模型列表来测试连接
            await self.client.models.list()
            return True
            
        except Exception as e:
            logger.error(f"GLM连接测试失败: {e}")
            return False