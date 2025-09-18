"""
OpenRouter API Provider实现

提供通过OpenRouter服务访问多种AI模型的能力
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

class OpenRouterProvider(BaseModelProvider):
    """OpenRouter API提供商实现"""
    
    # 免费模型列表 - 用于识别免费模型
    FREE_MODELS = {
        'deepseek/deepseek-r1:free',
        'deepseek/deepseek-r1-0528:free', 
        'qwen/qwq-32b:free',
        'qwen/qwen3-8b:free',
        'qwen/qwen3-30b-a3b:free',
        'qwen/qwen3-235b-a22b:free',
        'cognitivecomputations/dolphin3.0-mistral-24b:free',
        'mistralai/devstral-small-2505:free',
        'google/gemma-3n-e4b-it:free'
    }
    
    def __init__(self, config: ProviderConfig):
        """初始化OpenRouter提供商"""
        super().__init__(config)
        
        # 设置默认base_url
        if not self.config.base_url:
            self.config.base_url = "https://openrouter.ai/api/v1"
            
        self.api_url = f"{self.config.base_url}/chat/completions"
        
        # 当前选择的特定模型ID
        self._selected_model_id = None
        
        # OpenRouter预定义模型信息 - 包含免费和付费模型
        self._predefined_models = {
            "deepseek/deepseek-r1-0528:free": ModelInfo(
                id="deepseek/deepseek-r1-0528:free",
                name="DeepSeek R1 0528 (Free)",
                provider="OpenRouter",
                max_context_length=32000,
                max_input_tokens=24000,
                max_output_tokens=8000,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "deepseek/deepseek-r1:free": ModelInfo(
                id="deepseek/deepseek-r1:free",
                name="DeepSeek R1 (Free)",
                provider="OpenRouter",
                max_context_length=32000,
                max_input_tokens=24000,
                max_output_tokens=8000,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            ),
            "openai/gpt-oss-20b:free": ModelInfo(
                id="openai/gpt-oss-20b:free",
                name="GPT-OSS-20B (Free)",
                provider="OpenRouter",
                max_context_length=8192,
                max_input_tokens=6144,
                max_output_tokens=2048,
                input_price_per_1k=0.0,
                output_price_per_1k=0.0,
                supports_streaming=True
            )
        }
        
    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://tristaciss-prod.com",
            "X-Title": "Tristaciss Prod"
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
        """构建请求载荷"""
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        # 添加其他参数
        for key, value in kwargs.items():
            if key not in ['messages', 'model', 'stream', 'temperature', 'max_tokens']:
                payload[key] = value
                
        return payload
        
    def _parse_stream_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析流式响应行"""
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
        """执行聊天完成请求"""
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
            actual_model = self._selected_model_id or model or "deepseek/deepseek-r1-0528:free"
        
        logger.info(f"OpenRouter请求 - ID: {request_id}, 模型: {actual_model}, 流式: {stream}")
        
        headers = self._get_headers()
        payload = self._build_payload(messages, actual_model, stream, temperature, max_tokens, **kwargs)
        
        # 记录请求详情用于调试
        logger.info(f"OpenRouter请求载荷: {json.dumps(payload, ensure_ascii=False)}")
        
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
                    
                    logger.info(f"OpenRouter响应状态: {response.status}")
                    
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
                        
                        # 提取token使用信息
                        usage_info = None
                        if "usage" in result:
                            usage_data = result["usage"]
                            usage_info = {
                                "prompt_tokens": usage_data.get("prompt_tokens", 0),
                                "completion_tokens": usage_data.get("completion_tokens", 0),
                                "total_tokens": usage_data.get("total_tokens", 0),
                                "cache_creation_input_tokens": usage_data.get("cache_creation_input_tokens", 0),
                                "cache_read_input_tokens": usage_data.get("cache_read_input_tokens", 0)
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
                                            model=model,
                                            provider=self.provider_name
                                        )
                                
                                # 检查完成状态
                                if choice.get('finish_reason') is not None:
                                    logger.info(f"OpenRouter完成 - 原因: {choice.get('finish_reason')}")
                                    return
                            
                            # 处理token使用信息（通常在最后一个chunk中）
                            if 'usage' in chunk_data:
                                usage_data = chunk_data['usage']
                                # 提取token使用信息并通过最后一个chunk传递
                                usage_info = {
                                    "prompt_tokens": usage_data.get("prompt_tokens", 0),
                                    "completion_tokens": usage_data.get("completion_tokens", 0),
                                    "total_tokens": usage_data.get("total_tokens", 0),
                                    "cache_creation_input_tokens": usage_data.get("cache_creation_input_tokens", 0),
                                    "cache_read_input_tokens": usage_data.get("cache_read_input_tokens", 0)
                                }
                                
                                # 发送包含usage信息的最后一个chunk
                                yield StreamChunk(
                                    content="",
                                    chunk_id=chunk_count + 1,
                                    request_id=request_id,
                                    timestamp=time.time(),
                                    model=model,
                                    provider=self.provider_name,
                                    usage=usage_info
                                )
                                return
                                
                                # 发送包含token使用信息的特殊chunk
                                yield StreamChunk(
                                    content="",
                                    chunk_id=chunk_count + 1,
                                    request_id=request_id,
                                    timestamp=time.time(),
                                    model=model,
                                    provider=self.provider_name,
                                    usage=usage_info
                                )
                                    
        except aiohttp.ClientError as e:
            logger.error(f"OpenRouter连接错误: {e}")
            raise ProviderConnectionError(str(e), self.provider_name)
        except Exception as e:
            logger.error(f"OpenRouter请求错误: {e}")
            raise ProviderError(str(e), self.provider_name)
            
    def validate_config(self) -> bool:
        """验证配置是否有效"""
        if not self.config.api_key:
            raise ProviderError("API密钥不能为空", self.provider_name)
            
        # 允许占位符API密钥用于测试
        if not (self.config.api_key.startswith('sk-or-') or self.config.api_key == 'sk-or-v1-placeholder'):
            raise ProviderError("无效的OpenRouter API密钥格式", self.provider_name)
            
        return True
    
    def is_free_model(self, model_id: str) -> bool:
        """检查模型是否为免费模型"""
        return model_id in self.FREE_MODELS
    
    def get_free_models(self) -> List[str]:
        """获取所有免费模型列表"""
        return list(self.FREE_MODELS)
    
    def filter_free_models(self, model_list: List[str]) -> List[str]:
        """从模型列表中筛选出免费模型"""
        return [model for model in model_list if self.is_free_model(model)]
        
    async def get_supported_models(self) -> List[ModelInfo]:
        """获取支持的模型列表"""
        if self._models_cache is not None:
            return self._models_cache
            
        # 如果是占位符API密钥，直接返回预定义模型
        if self.config.api_key == 'sk-or-v1-placeholder':
            logger.info("OpenRouter使用占位符API密钥，返回预定义模型列表")
            self._models_cache = list(self._predefined_models.values())
            return self._models_cache
            
        try:
            # 尝试从OpenRouter API获取模型列表
            headers = self._get_headers()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.config.base_url}/models",
                    headers=headers,
                    timeout=10
                ) as response:
                    if response.status == 200:
                        models_data = await response.json()
                        if 'data' in models_data and isinstance(models_data['data'], list):
                            # 处理API返回的模型数据
                            models = []
                            for model_data in models_data['data']:
                                model_id = model_data.get('id')
                                if model_id:
                                    # 检查是否已有预定义模型信息
                                    if model_id in self._predefined_models:
                                        models.append(self._predefined_models[model_id])
                                    else:
                                        # 创建新的模型信息
                                        context_length = model_data.get('context_length', 4096)
                                        models.append(ModelInfo(
                                            id=model_id,
                                            name=model_data.get('name', model_id),
                                            provider="OpenRouter",
                                            max_context_length=context_length,
                                            max_input_tokens=int(context_length * 0.75),
                                            max_output_tokens=int(context_length * 0.25),
                                            input_price_per_1k=model_data.get('pricing', {}).get('prompt', 0.0001),
                                            output_price_per_1k=model_data.get('pricing', {}).get('completion', 0.0002),
                                            supports_streaming=True
                                        ))
                            
                            self._models_cache = models
                            return models
        except Exception as e:
            logger.error(f"从OpenRouter API获取模型列表失败: {e}")
            
        # 如果API获取失败，返回预定义的模型
        self._models_cache = list(self._predefined_models.values())
        return self._models_cache
        
    def set_model(self, model_id: str):
        """设置要使用的特定模型ID"""
        self._selected_model_id = model_id
        logger.info(f"OpenRouter设置特定模型: {model_id}")
        
    def _build_payload(
        self,
        messages: List[Dict[str, str]],
        model: str,
        stream: bool = True,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> Dict[str, Any]:
        """构建请求载荷"""
        # 如果设置了特定模型ID，则使用它
        actual_model = self._selected_model_id or model
        
        payload = {
            "model": actual_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
            "usage": {
                "include": True
            }
        }
        
        # 添加其他参数
        for key, value in kwargs.items():
            if key not in ['messages', 'model', 'stream', 'temperature', 'max_tokens']:
                payload[key] = value
                
        return payload
        
    async def test_connection(self) -> bool:
        """测试连接是否正常"""
        try:
            # 如果是占位符API密钥，直接返回成功（用于演示）
            if self.config.api_key == 'sk-or-v1-placeholder':
                logger.info("OpenRouter使用占位符API密钥，跳过连接测试")
                return True
            
            # 使用更简单的方法测试连接 - 只验证API密钥格式和服务可用性
            headers = self._get_headers()
            
            # 使用同步请求简单测试API可用性
            response = requests.get(
                f"{self.config.base_url}/models",
                headers=headers,
                timeout=10
            )
            
            # 检查响应状态
            if response.status_code == 200:
                logger.info("OpenRouter连接测试成功")
                return True
            elif response.status_code == 401:
                logger.error("OpenRouter API密钥无效")
                return False
            else:
                logger.error(f"OpenRouter连接测试失败: 状态码 {response.status_code}")
                return False
                
        except requests.RequestException as e:
            logger.error(f"OpenRouter连接测试失败: {e}")
            return False
        except Exception as e:
            logger.error(f"OpenRouter连接测试失败: {e}")
            return False
            
        return True
