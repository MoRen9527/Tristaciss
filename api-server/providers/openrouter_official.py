"""
OpenRouter 官方SDK Provider实现

使用OpenRouter官方SDK提供原生API调用支持
"""

import json
import time
import uuid
import asyncio
import aiohttp
import requests
from typing import Dict, List, Any, Optional, AsyncGenerator
import logging

from .base import (
    BaseModelProvider, ProviderConfig, ProviderType, ModelInfo,
    StreamChunk, ProviderError, ProviderConnectionError, 
    ProviderAuthenticationError, ProviderRateLimitError
)

logger = logging.getLogger(__name__)

class OpenRouterOfficialProvider(BaseModelProvider):
    """OpenRouter 官方SDK提供商实现"""
    
    def __init__(self, config: ProviderConfig):
        """初始化OpenRouter官方SDK提供商"""
        super().__init__(config)
        
        # 设置默认base_url
        if not self.config.base_url:
            self.config.base_url = "https://openrouter.ai/api/v1"
            
        self.api_url = f"{self.config.base_url}/chat/completions"
        self.models_url = f"{self.config.base_url}/models"
        
        # 当前选择的特定模型ID
        self._selected_model_id = None
        
        # OpenRouter免费模型信息（官方SDK模式专用）
        self._free_models = {
            "deepseek/deepseek-r1:free": ModelInfo(
                id="deepseek/deepseek-r1:free",
                name="DeepSeek R1 (Free)",
                provider="OpenRouter",
                max_context_length=163840,
                max_input_tokens=120000,
                max_output_tokens=43840,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "deepseek/deepseek-r1-0528:free": ModelInfo(
                id="deepseek/deepseek-r1-0528:free",
                name="DeepSeek R1 0528 (Free)",
                provider="OpenRouter",
                max_context_length=163840,
                max_input_tokens=120000,
                max_output_tokens=43840,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "qwen/qwen3-8b:free": ModelInfo(
                id="qwen/qwen3-8b:free",
                name="Qwen3 8B (Free)",
                provider="OpenRouter",
                max_context_length=40960,
                max_input_tokens=30000,
                max_output_tokens=10960,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "qwen/qwen3-30b-a3b:free": ModelInfo(
                id="qwen/qwen3-30b-a3b:free",
                name="Qwen3 30B A3B (Free)",
                provider="OpenRouter",
                max_context_length=40960,
                max_input_tokens=30000,
                max_output_tokens=10960,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "qwen/qwen3-235b-a22b:free": ModelInfo(
                id="qwen/qwen3-235b-a22b:free",
                name="Qwen3 235B A22B (Free)",
                provider="OpenRouter",
                max_context_length=131072,
                max_input_tokens=100000,
                max_output_tokens=31072,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "qwen/qwq-32b:free": ModelInfo(
                id="qwen/qwq-32b:free",
                name="Qwen QwQ 32B (Free)",
                provider="OpenRouter",
                max_context_length=32768,
                max_input_tokens=24000,
                max_output_tokens=8768,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "cognitivecomputations/dolphin3.0-mistral-24b:free": ModelInfo(
                id="cognitivecomputations/dolphin3.0-mistral-24b:free",
                name="Dolphin3.0 Mistral 24B (Free)",
                provider="OpenRouter",
                max_context_length=32768,
                max_input_tokens=24000,
                max_output_tokens=8768,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "mistralai/devstral-small-2505:free": ModelInfo(
                id="mistralai/devstral-small-2505:free",
                name="Mistral Devstral Small 2505 (Free)",
                provider="OpenRouter",
                max_context_length=32768,
                max_input_tokens=24000,
                max_output_tokens=8768,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "google/gemma-3n-e4b-it:free": ModelInfo(
                id="google/gemma-3n-e4b-it:free",
                name="Google Gemma 3n 4B (Free)",
                provider="OpenRouter",
                max_context_length=8192,
                max_input_tokens=6000,
                max_output_tokens=2192,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            )
        }
        
    def _get_headers(self) -> Dict[str, str]:
        """获取OpenRouter官方SDK请求头"""
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-url.com",
            "X-Title": "TriStaCiSS Digital Avatar",
            "User-Agent": "OpenRouter-Official-SDK/1.0"
        }
        
        # 添加额外的请求头
        if self.config.extra_headers:
            headers.update(self.config.extra_headers)
            
        return headers
        
    def _build_payload(
        self,
        messages: List[Dict[str, str]],
        model: str,
        stream: bool = True,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> Dict[str, Any]:
        """构建OpenRouter官方SDK请求载荷"""
        # 如果设置了特定模型ID，则使用它
        actual_model = self._selected_model_id or model
        
        payload = {
            "model": actual_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        # OpenRouter官方SDK特有参数
        if "models" in kwargs:
            # 支持fallback模型列表
            payload["models"] = kwargs["models"]
            
        if "provider" in kwargs:
            # 指定特定提供商
            payload["provider"] = kwargs["provider"]
            
        if "route" in kwargs:
            # 路由策略
            payload["route"] = kwargs["route"]
        
        # 添加其他参数
        for key, value in kwargs.items():
            if key not in ['messages', 'model', 'stream', 'temperature', 'max_tokens', 'models', 'provider', 'route']:
                payload[key] = value
                
        return payload
        
    def _parse_stream_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析流式响应行（官方SDK格式）"""
        # 移除 "data: " 前缀
        if line.startswith('data: '):
            line = line[6:]
            
        # 跳过空行和心跳消息
        if not line.strip() or line.strip() == '[DONE]':
            return None
            
        # 跳过OpenRouter的状态消息（非JSON格式）
        if line.startswith(':') or 'OPENROUTER' in line.upper():
            logger.debug(f"跳过OpenRouter状态消息: {line}")
            return None
            
        # 验证是否为有效JSON格式
        if not line.strip().startswith('{'):
            logger.debug(f"跳过非JSON行: {line}")
            return None
            
        try:
            return json.loads(line.strip())
        except json.JSONDecodeError as e:
            logger.debug(f"JSON解析失败: {line} - {e}")
            return None
            
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        stream: bool = True,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> AsyncGenerator[StreamChunk, None]:
        """执行聊天完成请求（官方SDK模式）"""
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        chunk_count = 0
        complete_content = ""
        
        # 如果model_id在kwargs中，优先使用它
        model_id = kwargs.pop('model_id', None)
        if model_id:
            self.set_model(model_id)
            actual_model = model_id
        else:
            actual_model = self._selected_model_id or model or "deepseek/deepseek-r1:free"
        
        logger.info(f"OpenRouter官方SDK请求 - ID: {request_id}, 模型: {actual_model}, 流式: {stream}")
        
        headers = self._get_headers()
        payload = self._build_payload(messages, actual_model, stream, temperature, max_tokens, **kwargs)
        
        try:
            connector = aiohttp.TCPConnector(ssl=False)
            timeout = aiohttp.ClientTimeout(total=self.config.timeout)
            
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=timeout
                ) as response:
                    
                    logger.info(f"OpenRouter官方SDK响应状态: {response.status}")
                    
                    if response.status == 401:
                        raise ProviderAuthenticationError(
                            "API密钥无效或已过期", 
                            self.provider_name
                        )
                    elif response.status == 429:
                        raise ProviderRateLimitError(
                            "请求频率超限，请稍后重试", 
                            self.provider_name
                        )
                    elif response.status != 200:
                        error_text = await response.text()
                        raise ProviderConnectionError(
                            f"API请求失败: {response.status} - {error_text}",
                            self.provider_name
                        )
                    
                    if not stream:
                        # 非流式响应
                        result = await response.json()
                        content = result["choices"][0]["message"]["content"]
                        
                        yield StreamChunk(
                            content=content,
                            chunk_id=1,
                            request_id=request_id,
                            timestamp=time.time(),
                            model=actual_model,
                            provider=f"{self.provider_name}-official"
                        )
                        return
                    
                    # 流式响应处理
                    async for line in response.content:
                        if not line:
                            continue
                            
                        line_str = line.decode('utf-8').strip()
                        if not line_str:
                            continue
                            
                        # 处理每一行
                        for actual_line in line_str.split('\n'):
                            chunk_data = self._parse_stream_line(actual_line)
                            if not chunk_data:
                                continue
                                
                            # 处理流式数据块
                            if 'choices' in chunk_data and len(chunk_data['choices']) > 0:
                                choice = chunk_data['choices'][0]
                                
                                if 'delta' in choice and 'content' in choice['delta']:
                                    content = choice['delta']['content']
                                    if content:
                                        chunk_count += 1
                                        complete_content += content
                                        
                                        yield StreamChunk(
                                            content=content,
                                            chunk_id=chunk_count,
                                            request_id=request_id,
                                            timestamp=time.time(),
                                            model=actual_model,
                                            provider=f"{self.provider_name}-official"
                                        )
                                
                                # 检查完成状态
                                if choice.get('finish_reason') is not None:
                                    logger.info(f"OpenRouter官方SDK完成 - 原因: {choice.get('finish_reason')}")
                                    return
                                    
        except aiohttp.ClientError as e:
            logger.error(f"OpenRouter官方SDK连接错误: {e}")
            raise ProviderConnectionError(str(e), self.provider_name)
        except Exception as e:
            logger.error(f"OpenRouter官方SDK请求错误: {e}")
            raise ProviderError(str(e), self.provider_name)
            
    def validate_config(self) -> bool:
        """验证配置是否有效"""
        if not self.config.api_key:
            raise ProviderError("API密钥不能为空", self.provider_name)
            
        # 允许占位符API密钥用于测试
        if not (self.config.api_key.startswith('sk-or-') or self.config.api_key == 'sk-or-v1-placeholder'):
            raise ProviderError("无效的OpenRouter API密钥格式", self.provider_name)
            
        return True
        
    async def get_supported_models(self) -> List[ModelInfo]:
        """获取支持的模型列表（官方SDK模式）"""
        if self._models_cache is not None:
            return self._models_cache
            
        # 如果是占位符API密钥，直接返回免费模型
        if self.config.api_key == 'sk-or-v1-placeholder':
            logger.info("OpenRouter官方SDK使用占位符API密钥，返回免费模型列表")
            self._models_cache = list(self._free_models.values())
            return self._models_cache
            
        try:
            # 尝试从OpenRouter API获取模型列表
            headers = self._get_headers()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.models_url,
                    headers=headers,
                    timeout=10
                ) as response:
                    if response.status == 200:
                        models_data = await response.json()
                        if 'data' in models_data and isinstance(models_data['data'], list):
                            # 处理API返回的模型数据，优先返回免费模型
                            models = []
                            for model_data in models_data['data']:
                                model_id = model_data.get('id')
                                if model_id:
                                    # 检查是否为免费模型
                                    if model_id in self._free_models:
                                        models.append(self._free_models[model_id])
                                    elif model_data.get('pricing', {}).get('prompt') == '0':
                                        # 动态检测免费模型
                                        context_length = model_data.get('context_length', 4096)
                                        models.append(ModelInfo(
                                            id=model_id,
                                            name=f"{model_data.get('name', model_id)} (Free)",
                                            provider="OpenRouter",
                                            max_context_length=context_length,
                                            max_input_tokens=int(context_length * 0.75),
                                            max_output_tokens=int(context_length * 0.25),
                                            input_price_per_1k=0.0,
                                            output_price_per_1k=0.0,
                                            supports_streaming=True
                                        ))
                            
                            # 如果没有找到免费模型，返回预定义的免费模型
                            if not models:
                                models = list(self._free_models.values())
                            
                            self._models_cache = models
                            return models
        except Exception as e:
            logger.error(f"从OpenRouter官方SDK API获取模型列表失败: {e}")
            
        # 如果API获取失败，返回预定义的免费模型
        self._models_cache = list(self._free_models.values())
        return self._models_cache
        
    def set_model(self, model_id: str):
        """设置要使用的特定模型ID"""
        self._selected_model_id = model_id
        logger.info(f"OpenRouter官方SDK设置特定模型: {model_id}")
        
    async def test_connection(self) -> bool:
        """测试连接是否正常"""
        try:
            # 如果是占位符API密钥，直接返回成功（用于演示）
            if self.config.api_key == 'sk-or-v1-placeholder':
                logger.info("OpenRouter官方SDK使用占位符API密钥，跳过连接测试")
                return True
            
            # 使用更简单的方法测试连接 - 只验证API密钥格式和服务可用性
            headers = self._get_headers()
            
            # 使用同步请求简单测试API可用性
            response = requests.get(
                self.models_url,
                headers=headers,
                timeout=10
            )
            
            # 检查响应状态
            if response.status_code == 200:
                logger.info("OpenRouter官方SDK连接测试成功")
                return True
            elif response.status_code == 401:
                logger.error("OpenRouter官方SDK API密钥无效")
                return False
            else:
                logger.error(f"OpenRouter官方SDK连接测试失败: 状态码 {response.status_code}")
                return False
                
        except requests.RequestException as e:
            logger.error(f"OpenRouter官方SDK连接测试失败: {e}")
            return False
        except Exception as e:
            logger.error(f"OpenRouter官方SDK连接测试失败: {e}")
            return False
            
        return True
        
    @property
    def provider_name(self) -> str:
        """获取提供商名称"""
        return "openrouter-official"