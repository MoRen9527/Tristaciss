"""
Provider管理器

统一管理和路由不同的AI模型提供商
"""

import json
import os
from typing import Dict, List, Optional, AsyncGenerator, Any
import logging

from .base import (
    BaseModelProvider, ProviderConfig, ProviderType, ModelInfo,
    StreamChunk, ProviderError
)
from .openrouter import OpenRouterProvider
from .openrouter_official import OpenRouterOfficialProvider
from .openai import OpenAIProvider
from .glm import GLMProvider
from .free_model_manager import free_model_manager

# 导入配置管理器
try:
    from config_manager import config_manager
except ImportError:
    config_manager = None
    logging.warning("配置管理器导入失败，将使用环境变量模式")

logger = logging.getLogger(__name__)

class ProviderManager:
    """Provider管理器"""
    
    def __init__(self):
        """初始化Provider管理器"""
        self._providers: Dict[str, BaseModelProvider] = {}
        self._default_provider: Optional[str] = None
        self._model_provider_mapping: Dict[str, str] = {}
        
        # 加载默认配置
        self._load_default_providers()
        
    def _load_default_providers(self):
        """从配置文件和环境变量加载默认Provider配置"""
        logger.info("开始加载默认Provider配置...")
        
        # 优先从配置文件加载
        if config_manager:
            saved_configs = config_manager.get_all_provider_configs()
            logger.info(f"从配置文件加载到 {len(saved_configs)} 个Provider配置")
            
            for provider_name, saved_config in saved_configs.items():
                # 修改条件：只要有配置就尝试加载，不管是否启用或有API密钥
                if saved_config and provider_name != 'test_provider':
                    try:
                        # 根据provider名称确定类型
                        if provider_name in ['openrouter', 'openrouter_compatible']:
                            provider_type = ProviderType.OPENROUTER
                        elif provider_name == 'openrouter_official':
                            provider_type = ProviderType.OPENROUTER
                        elif provider_name in ['openai', 'deepseek']:
                            provider_type = ProviderType.OPENAI
                        elif provider_name == 'glm':
                            provider_type = ProviderType.GLM
                        else:
                            logger.warning(f"未知的provider类型: {provider_name}")
                            continue
                        
                        config = ProviderConfig(
                            provider_type=provider_type,
                            api_key=saved_config.get('api_key', ''),
                            base_url=saved_config.get('base_url', ''),
                            default_model=saved_config.get('default_model', '')
                        )
                        
                        # 即使没有API密钥也尝试注册，这样前端可以看到并配置
                        success = self.register_provider(provider_name, config, skip_validation=True)
                        if success:
                            if not self._default_provider:
                                self._default_provider = provider_name
                            logger.info(f"从配置文件加载Provider成功: {provider_name}")
                        else:
                            logger.error(f"从配置文件加载Provider失败: {provider_name}")
                    except Exception as e:
                        logger.error(f"配置文件Provider配置失败 - {provider_name}: {e}")
        
        # 如果没有从配置文件加载到任何provider，则从环境变量加载
        if not self._providers:
            logger.info("配置文件中无可用Provider，从环境变量加载...")
            
            # OpenRouter配置
            openrouter_key = os.getenv("OPENROUTER_API_KEY")
            logger.info(f"OpenRouter API Key存在: {bool(openrouter_key)}")
            
            if openrouter_key:
                try:
                    config = ProviderConfig(
                        provider_type=ProviderType.OPENROUTER,
                        api_key=openrouter_key,
                        base_url="https://openrouter.ai/api/v1",
                        default_model="deepseek/deepseek-r1-0528:free"
                    )
                    success = self.register_provider("openrouter", config)
                    if success:
                        self._default_provider = "openrouter"
                        logger.info("OpenRouter provider注册成功")
                    else:
                        logger.error("OpenRouter provider注册失败")
                except Exception as e:
                    logger.error(f"OpenRouter配置失败: {e}")
            
            # OpenAI配置（支持自定义base_url用于DeepSeek等）
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key:
                try:
                    base_url = os.getenv("OPENAI_BASE_URL")
                    default_model = os.getenv("OPENAI_DEFAULT_MODEL")
                    
                    # 智能模型选择
                    if not default_model and base_url:
                        if "deepseek" in base_url.lower():
                            default_model = "deepseek-chat"
                        else:
                            default_model = "gpt-3.5-turbo"
                    
                    config = ProviderConfig(
                        provider_type=ProviderType.OPENAI,
                        api_key=openai_key,
                        base_url=base_url,
                        default_model=default_model or "gpt-3.5-turbo"
                    )
                    success = self.register_provider("openai", config)
                    if success:
                        if not self._default_provider:
                            self._default_provider = "openai"
                        logger.info("OpenAI provider注册成功")
                    else:
                        logger.error("OpenAI provider注册失败")
                except Exception as e:
                    logger.error(f"OpenAI配置失败: {e}")
                    
            # GLM配置
            glm_key = os.getenv("GLM_API_KEY")
            if glm_key:
                try:
                    base_url = os.getenv("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")
                    default_model = os.getenv("GLM_DEFAULT_MODEL", "glm-4")
                    
                    config = ProviderConfig(
                        provider_type=ProviderType.GLM,
                        api_key=glm_key,
                        base_url=base_url,
                        default_model=default_model
                    )
                    success = self.register_provider("glm", config)
                    if success:
                        if not self._default_provider:
                            self._default_provider = "glm"
                        logger.info("GLM provider注册成功")
                    else:
                        logger.error("GLM provider注册失败")
                except Exception as e:
                    logger.error(f"GLM配置失败: {e}")
        
        logger.info(f"Provider加载完成，已注册: {list(self._providers.keys())}")
        logger.info(f"默认Provider: {self._default_provider}")
    
    def register_provider(self, name: str, config: ProviderConfig, skip_validation: bool = False) -> bool:
        """
        注册新的Provider
        
        Args:
            name: Provider名称
            config: Provider配置
            skip_validation: 是否跳过配置验证
            
        Returns:
            bool: 注册是否成功
        """
        try:
            # 根据类型创建Provider实例
            if config.provider_type == ProviderType.OPENAI:
                provider = OpenAIProvider(config)
            elif config.provider_type == ProviderType.OPENROUTER:
                # 根据名称判断使用哪种OpenRouter实现
                if name == 'openrouter_official':
                    provider = OpenRouterOfficialProvider(config)
                else:
                    provider = OpenRouterProvider(config)
            elif config.provider_type == ProviderType.GLM:
                provider = GLMProvider(config)
            else:
                raise ProviderError(f"不支持的Provider类型: {config.provider_type}", name)
                
            # 验证配置（可选）
            if not skip_validation:
                provider.validate_config()
            
            # 注册Provider
            self._providers[name] = provider
            
            logger.info(f"成功注册Provider: {name} ({config.provider_type.value})")
            return True
            
        except Exception as e:
            logger.error(f"注册Provider失败 - {name}: {e}")
            return False
            
    def unregister_provider(self, name: str) -> bool:
        """
        注销Provider
        
        Args:
            name: Provider名称
            
        Returns:
            bool: 注销是否成功
        """
        if name in self._providers:
            del self._providers[name]
            
            # 如果删除的是默认provider，选择新的默认值
            if self._default_provider == name:
                self._default_provider = next(iter(self._providers.keys())) if self._providers else None
                
            logger.info(f"成功注销Provider: {name}")
            return True
        else:
            logger.warning(f"Provider不存在: {name}")
            return False
            
    def get_provider(self, name: str) -> Optional[BaseModelProvider]:
        """
        获取指定的Provider
        
        Args:
            name: Provider名称，可以是简单名称或格式为"provider:model_id"的复合名称
            
        Returns:
            Optional[BaseModelProvider]: Provider实例
        """
        # 检查是否是带有模型ID的格式 (provider:model_id)
        if ':' in name:
            base_provider_name, model_id = name.split(':', 1)
            provider = self._providers.get(base_provider_name)
            if provider:
                # 创建一个配置了特定模型的Provider副本
                import copy
                provider_copy = copy.deepcopy(provider)
                if hasattr(provider_copy, 'set_model'):
                    provider_copy.set_model(model_id)
                return provider_copy
        
        # 常规Provider查找
        return self._providers.get(name)
        
    def get_provider_for_model(self, model: str) -> Optional[BaseModelProvider]:
        """
        根据模型名称获取对应的Provider
        
        Args:
            model: 模型名称
            
        Returns:
            Optional[BaseModelProvider]: Provider实例
        """
        # 检查是否有明确的映射关系
        if model in self._model_provider_mapping:
            provider_name = self._model_provider_mapping[model]
            return self._providers.get(provider_name)
            
        # 根据模型名称前缀判断
        if model.startswith('gpt-') or model.startswith('openai/'):
            # OpenAI模型
            if 'openai' in self._providers:
                return self._providers['openai']
        elif '/' in model:
            # OpenRouter格式的模型 (provider/model)
            if 'openrouter' in self._providers:
                return self._providers['openrouter']
                
        # 返回默认Provider
        if self._default_provider:
            return self._providers.get(self._default_provider)
            
        # 返回第一个可用的Provider
        return next(iter(self._providers.values())) if self._providers else None
        
    def set_model_provider_mapping(self, model: str, provider_name: str):
        """
        设置模型到Provider的映射关系
        
        Args:
            model: 模型名称
            provider_name: Provider名称
        """
        if provider_name in self._providers:
            self._model_provider_mapping[model] = provider_name
            logger.info(f"设置模型映射: {model} -> {provider_name}")
        else:
            logger.warning(f"Provider不存在: {provider_name}")
            
    async def route_request(
        self,
        provider_name: Optional[str],
        model: str,
        messages: List[Dict[str, str]],
        stream: bool = True,
        **kwargs
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        路由请求到指定的Provider
        
        Args:
            provider_name: Provider名称，如果为None则自动选择
            model: 模型名称
            messages: 对话消息
            stream: 是否流式输出
            **kwargs: 其他参数
            
        Yields:
            StreamChunk: 流式响应块
            
        Raises:
            ProviderError: Provider相关错误
        """
        # 选择Provider
        if provider_name:
            provider = self.get_provider(provider_name)
            if not provider:
                raise ProviderError(f"Provider不存在: {provider_name}", provider_name)
                
            # 当指定provider时，使用该provider的默认模型
            # 避免不同provider间的模型名称冲突
            actual_model = provider.config.default_model
            logger.info(f"指定Provider: {provider_name}, 使用默认模型: {actual_model}")
        else:
            provider = self.get_provider_for_model(model)
            if not provider:
                raise ProviderError("没有可用的Provider", "unknown")
            actual_model = model
                
        logger.info(f"路由请求到Provider: {provider.provider_name}, 模型: {actual_model}")
        
        # 执行请求
        async for chunk in provider.chat_completion(
            messages=messages,
            model=actual_model,
            stream=stream,
            **kwargs
        ):
            yield chunk
            
    async def get_all_supported_models(self) -> Dict[str, List[ModelInfo]]:
        """
        获取所有Provider支持的模型列表
        
        Returns:
            Dict[str, List[ModelInfo]]: 按Provider分组的模型列表
        """
        all_models = {}
        
        for name, provider in self._providers.items():
            try:
                models = await provider.get_supported_models()
                all_models[name] = models
            except Exception as e:
                logger.error(f"获取{name}模型列表失败: {e}")
                all_models[name] = []
                
        return all_models
        
    async def test_all_connections(self) -> Dict[str, bool]:
        """
        测试所有Provider的连接状态
        
        Returns:
            Dict[str, bool]: 各Provider的连接状态
        """
        results = {}
        
        for name, provider in self._providers.items():
            try:
                results[name] = await provider.test_connection()
            except Exception as e:
                logger.error(f"测试{name}连接失败: {e}")
                results[name] = False
                
        return results
    
    async def test_connection(self, provider_name: str) -> bool:
        """
        测试指定Provider的连接状态
        
        Args:
            provider_name: Provider名称
            
        Returns:
            bool: 连接状态
        """
        provider = self.get_provider(provider_name)
        if not provider:
            return False
            
        try:
            return await provider.test_connection()
        except Exception as e:
            logger.error(f"测试{provider_name}连接失败: {e}")
            return False
    
    async def get_provider_status(self) -> Dict[str, Dict[str, Any]]:
        """
        获取所有Provider的状态信息
        
        Returns:
            Dict[str, Dict[str, Any]]: Provider状态信息
        """
        status = {}
        
        for name, provider in self._providers.items():
            try:
                is_connected = await provider.test_connection()
                status[name] = {
                    "connected": is_connected,
                    "provider_type": provider.provider_type.value,
                    "base_url": provider.config.base_url,
                    "default_model": provider.config.default_model,
                    "has_api_key": bool(provider.config.api_key)
                }
            except Exception as e:
                logger.error(f"获取{name}状态失败: {e}")
                status[name] = {
                    "connected": False,
                    "error": str(e),
                    "provider_type": provider.provider_type.value,
                    "base_url": provider.config.base_url,
                    "default_model": provider.config.default_model,
                    "has_api_key": bool(provider.config.api_key)
                }
                
        return status
        
    def get_provider_info(self) -> Dict[str, Dict[str, Any]]:
        """
        获取所有Provider的基本信息
        
        Returns:
            Dict[str, Dict[str, Any]]: Provider信息
        """
        info = {}
        
        for name, provider in self._providers.items():
            info[name] = {
                "provider_type": provider.provider_type.value,
                "base_url": provider.config.base_url,
                "default_model": provider.config.default_model,
                "has_api_key": bool(provider.config.api_key),
                "is_default": name == self._default_provider
            }
            
        return info
        
    async def configure_provider(self, name: str, config: ProviderConfig) -> bool:
        """
        保存/更新Provider配置（幂等）
        
        Args:
            name: Provider名称（如 openrouter/openai/deepseek/glm）
            config: ProviderConfig 配置
        Returns:
            bool: 是否保存成功
        """
        try:
            # 默认模型兜底
            if not config.default_model:
                if config.provider_type == ProviderType.OPENROUTER:
                    config.default_model = "deepseek/deepseek-r1-0528:free"
                elif config.provider_type == ProviderType.OPENAI:
                    if name == 'deepseek':
                        config.default_model = "deepseek-chat"
                    elif name == 'glm':
                        config.default_model = "glm-4"
                    else:
                        config.default_model = "gpt-3.5-turbo"
            
            # 实例化并校验
            if config.provider_type == ProviderType.OPENAI:
                provider = OpenAIProvider(config)
            elif config.provider_type == ProviderType.OPENROUTER:
                # 根据名称判断使用哪种OpenRouter实现
                if name == 'openrouter_official':
                    provider = OpenRouterOfficialProvider(config)
                else:
                    provider = OpenRouterProvider(config)
            elif config.provider_type == ProviderType.GLM:
                provider = GLMProvider(config)
            else:
                raise ProviderError(f"不支持的Provider类型: {config.provider_type}", name)
            
            provider.validate_config()
            
            # 注册/更新到内存
            self._providers[name] = provider
            
            # 若尚无默认Provider，设置为默认
            if not self._default_provider:
                self._default_provider = name
            
            # 保存到配置文件
            if config_manager:
                config_data = {
                    'api_key': config.api_key,
                    'base_url': config.base_url,
                    'default_model': config.default_model,
                    'enabled': True
                }
                config_manager.save_provider_config(name, config_data)
                logger.info(f"Provider配置已保存到文件: {name}")
            
            logger.info(f"保存Provider配置成功: {name} ({config.provider_type.value})")
            return True
        except Exception as e:
            logger.error(f"保存Provider配置失败 - {name}: {e}")
            return False

    def set_default_provider(self, name: str) -> bool:
        """
        设置默认Provider
        
        Args:
            name: Provider名称
            
        Returns:
            bool: 设置是否成功
        """
        if name in self._providers:
            self._default_provider = name
            logger.info(f"设置默认Provider: {name}")
            return True
        else:
            logger.warning(f"Provider不存在: {name}")
            return False
            
    @property
    def provider_count(self) -> int:
        """获取已注册的Provider数量"""
        return len(self._providers)
        
    @property
    def provider_names(self) -> List[str]:
        """获取已注册的Provider名称列表"""
        return list(self._providers.keys())
        
    @property
    def default_provider_name(self) -> Optional[str]:
        """获取默认Provider名称"""
        return self._default_provider
        
    async def get_free_models(self, provider_name: Optional[str] = None) -> Dict[str, List[ModelInfo]]:
        """
        获取免费模型列表
        
        Args:
            provider_name: 指定提供商名称，如果为None则返回所有免费模型
            
        Returns:
            Dict[str, List[ModelInfo]]: 按提供商分组的免费模型列表
        """
        free_models = {}
        
        if provider_name:
            # 获取指定提供商的免费模型
            if provider_name in ['openrouter', 'openrouter_compatible', 'openrouter_official']:
                free_models[provider_name] = free_model_manager.get_free_model_list("OpenRouter")
        else:
            # 获取所有免费模型
            free_models["openrouter"] = free_model_manager.get_free_model_list("OpenRouter")
            
        return free_models
        
    def get_recommended_free_models(self, use_case: str = "general") -> List[str]:
        """
        根据用例获取推荐的免费模型
        
        Args:
            use_case: 用例类型 (general, reasoning, coding, chat, multimodal)
            
        Returns:
            List[str]: 推荐的免费模型ID列表
        """
        return free_model_manager.get_recommended_models(use_case)
        
    def is_free_model(self, model_id: str) -> bool:
        """
        检查是否为免费模型
        
        Args:
            model_id: 模型ID
            
        Returns:
            bool: 是否为免费模型
        """
        return free_model_manager.is_free_model(model_id)
        
    def get_model_capabilities(self, model_id: str) -> Dict[str, Any]:
        """
        获取模型能力信息
        
        Args:
            model_id: 模型ID
            
        Returns:
            Dict[str, Any]: 模型能力信息
        """
        capabilities = {}
        
        # 检查是否为免费模型
        is_free = self.is_free_model(model_id)
        capabilities['free'] = is_free
        
        # 如果有免费模型管理器的信息，使用它
        if hasattr(self, 'free_model_manager'):
            free_capabilities = free_model_manager.get_model_capabilities(model_id)
            capabilities.update(free_capabilities)
        else:
            # 基于模型ID推断能力
            if ':free' in model_id:
                capabilities['free'] = True
            if 'deepseek' in model_id.lower() or 'qwen' in model_id.lower():
                capabilities['reasoning'] = True
            if 'vision' in model_id.lower() or 'gemma' in model_id.lower():
                capabilities['vision'] = True
            if 'coder' in model_id.lower() or 'devstral' in model_id.lower():
                capabilities['function_calling'] = True
                
        return capabilities
    
    def is_free_model(self, model_id: str) -> bool:
        """
        检查模型是否为免费模型
        
        Args:
            model_id: 模型ID
            
        Returns:
            bool: 是否为免费模型
        """
        # 通用规则：包含 :free 后缀的模型
        if ':free' in model_id:
            return True
            
        # 检查各个提供商的免费模型
        for provider_name, provider in self._providers.items():
            if hasattr(provider, 'is_free_model'):
                if provider.is_free_model(model_id):
                    return True
                    
        return False
    
    def get_free_models_by_provider(self, provider_name: str) -> List[str]:
        """
        获取指定提供商的免费模型列表
        
        Args:
            provider_name: 提供商名称
            
        Returns:
            List[str]: 免费模型列表
        """
        if provider_name not in self._providers:
            return []
            
        provider = self._providers[provider_name]
        if hasattr(provider, 'get_free_models'):
            return provider.get_free_models()
            
        return []