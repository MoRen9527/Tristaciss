"""
基础模型提供商抽象类

定义所有AI模型提供商必须实现的统一接口
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, AsyncGenerator, Union
from pydantic import BaseModel, Field
from enum import Enum
import asyncio
import logging

logger = logging.getLogger(__name__)

class ProviderType(str, Enum):
    """提供商类型枚举"""
    OPENAI = "openai"
    OPENROUTER = "openrouter"
    ANTHROPIC = "anthropic"
    CUSTOM = "custom"
    GLM = "glm"

class ProviderConfig(BaseModel):
    """提供商配置模型"""
    provider_type: ProviderType = Field(..., description="提供商类型")
    api_key: str = Field(..., description="API密钥")
    base_url: Optional[str] = Field(None, description="API基础URL")
    default_model: Optional[str] = Field(None, description="默认模型")
    extra_headers: Optional[Dict[str, str]] = Field(None, description="额外请求头")
    timeout: Optional[int] = Field(60, description="请求超时时间(秒)")

class ModelInfo(BaseModel):
    """模型信息"""
    id: str = Field(..., description="模型ID")
    name: str = Field(..., description="模型显示名称")
    provider: str = Field(..., description="提供商")
    max_context_length: int = Field(..., description="最大上下文长度")
    max_input_tokens: int = Field(..., description="最大输入Token数")
    max_output_tokens: int = Field(..., description="最大输出Token数")
    input_price_per_1k: float = Field(..., description="输入价格(每1K tokens)")
    output_price_per_1k: float = Field(..., description="输出价格(每1K tokens)")
    supports_streaming: bool = Field(True, description="是否支持流式输出")

class StreamChunk(BaseModel):
    """流式响应块"""
    content: str = Field("", description="内容片段")
    chunk_id: int = Field(..., description="块ID")
    request_id: str = Field(..., description="请求ID")
    timestamp: float = Field(..., description="时间戳")
    model: str = Field(..., description="使用的模型")
    provider: str = Field(..., description="提供商")
    usage: Optional[Dict[str, int]] = Field(None, description="Token使用统计")

class CompletionResponse(BaseModel):
    """完成响应"""
    content: str = Field(..., description="完整内容")
    model: str = Field(..., description="使用的模型")
    provider: str = Field(..., description="提供商")
    usage: Optional[Dict[str, int]] = Field(None, description="Token使用统计")
    cost: Optional[Dict[str, float]] = Field(None, description="成本信息")
    request_id: str = Field(..., description="请求ID")
    timestamp: float = Field(..., description="完成时间戳")

class ProviderError(Exception):
    """提供商错误基类"""
    def __init__(self, message: str, provider: str, error_code: Optional[str] = None):
        self.message = message
        self.provider = provider
        self.error_code = error_code
        super().__init__(f"[{provider}] {message}")

class ProviderConnectionError(ProviderError):
    """连接错误"""
    pass

class ProviderAuthenticationError(ProviderError):
    """认证错误"""
    pass

class ProviderRateLimitError(ProviderError):
    """速率限制错误"""
    pass

class ProviderModelNotFoundError(ProviderError):
    """模型未找到错误"""
    pass

class BaseModelProvider(ABC):
    """
    模型提供商抽象基类
    
    所有AI模型提供商都必须继承此类并实现所有抽象方法
    """
    
    def __init__(self, config: ProviderConfig):
        """
        初始化提供商
        
        Args:
            config: 提供商配置
        """
        self.config = config
        self.provider_type = config.provider_type
        self._models_cache: Optional[List[ModelInfo]] = None
        
    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        stream: bool = True,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        执行聊天完成请求
        
        Args:
            messages: 对话消息列表
            model: 模型名称
            stream: 是否流式输出
            temperature: 生成温度
            max_tokens: 最大token数
            **kwargs: 其他参数
            
        Yields:
            StreamChunk: 流式响应块
            
        Raises:
            ProviderError: 提供商相关错误
        """
        pass
        
    @abstractmethod
    def validate_config(self) -> bool:
        """
        验证配置是否有效
        
        Returns:
            bool: 配置是否有效
            
        Raises:
            ProviderError: 配置验证失败
        """
        pass
        
    @abstractmethod
    async def get_supported_models(self) -> List[ModelInfo]:
        """
        获取支持的模型列表
        
        Returns:
            List[ModelInfo]: 模型信息列表
            
        Raises:
            ProviderError: 获取模型列表失败
        """
        pass
        
    @abstractmethod
    async def test_connection(self) -> bool:
        """
        测试连接是否正常
        
        Returns:
            bool: 连接是否正常
            
        Raises:
            ProviderError: 连接测试失败
        """
        pass
        
    def get_model_info(self, model_id: str) -> Optional[ModelInfo]:
        """
        获取特定模型的信息
        
        Args:
            model_id: 模型ID
            
        Returns:
            Optional[ModelInfo]: 模型信息，如果不存在则返回None
        """
        if self._models_cache is None:
            return None
            
        for model in self._models_cache:
            if model.id == model_id:
                return model
        return None
        
    def calculate_cost(
        self, 
        model_id: str, 
        input_tokens: int, 
        output_tokens: int
    ) -> Dict[str, float]:
        """
        计算API调用成本
        
        Args:
            model_id: 模型ID
            input_tokens: 输入token数
            output_tokens: 输出token数
            
        Returns:
            Dict[str, float]: 成本信息
        """
        model_info = self.get_model_info(model_id)
        if not model_info:
            return {"input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0}
            
        input_cost = (input_tokens / 1000) * model_info.input_price_per_1k
        output_cost = (output_tokens / 1000) * model_info.output_price_per_1k
        total_cost = input_cost + output_cost
        
        return {
            "input_cost": input_cost,
            "output_cost": output_cost,
            "total_cost": total_cost,
            "currency": "USD"
        }
        
    @property
    def provider_name(self) -> str:
        """获取提供商名称"""
        return self.provider_type.value
        
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(provider={self.provider_name})>"