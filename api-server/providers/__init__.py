"""
AI模型提供商 (Providers) 模块

提供统一的API代理层，支持多种AI服务提供商：
- OpenAI API
- OpenRouter API  
- Anthropic API
- 智谱GLM API
- 自定义API

使用方法:
    from providers import ProviderManager
    
    manager = ProviderManager()
    response = await manager.route_request('openai', 'gpt-4', messages)
"""

from .base import (
    BaseModelProvider, ProviderConfig, ProviderType, ModelInfo,
    StreamChunk, CompletionResponse, ProviderError,
    ProviderConnectionError, ProviderAuthenticationError, 
    ProviderRateLimitError, ProviderModelNotFoundError
)
from .openrouter import OpenRouterProvider
from .openai import OpenAIProvider
from .glm import GLMProvider
from .manager import ProviderManager

__all__ = [
    'BaseModelProvider', 'ProviderConfig', 'ProviderType', 'ModelInfo',
    'StreamChunk', 'CompletionResponse', 'ProviderError',
    'ProviderConnectionError', 'ProviderAuthenticationError', 
    'ProviderRateLimitError', 'ProviderModelNotFoundError',
    'OpenRouterProvider', 'OpenAIProvider', 'GLMProvider', 'ProviderManager'
]
