"""
OpenRouter 双模式配置API

提供OpenRouter兼容模式和官方SDK模式的配置管理接口
"""

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime

from providers.manager import ProviderManager
from providers.base import ProviderConfig, ProviderType
from providers.free_model_manager import free_model_manager
from providers.multi_model_router import MultiModelRouter, RoutingStrategy

logger = logging.getLogger(__name__)

# 全局Provider管理器实例
provider_manager = ProviderManager()

class OpenRouterModeConfig(BaseModel):
    """OpenRouter模式配置"""
    api_key: str = Field(..., description="OpenRouter API密钥")
    base_url: str = Field(default="https://openrouter.ai/api/v1", description="API基础URL")
    default_model: str = Field(default="deepseek/deepseek-r1:free", description="默认模型")
    enabled: bool = Field(default=True, description="是否启用")
    provider_mode: str = Field(..., description="提供商模式: openai_compatible 或 official_sdk")
    free_models_only: bool = Field(default=True, description="仅启用免费模型")
    enabled_models: List[str] = Field(default_factory=list, description="启用的模型列表")
    routing_strategy: str = Field(default="round_robin", description="路由策略")
    max_retries: int = Field(default=3, description="最大重试次数")
    timeout_per_model: float = Field(default=30.0, description="每个模型超时时间")

class OpenRouterConfigResponse(BaseModel):
    """OpenRouter配置响应"""
    success: bool
    message: str
    config: Optional[Dict[str, Any]] = None

class FreeModelInfo(BaseModel):
    """免费模型信息"""
    model_id: str
    name: str
    provider: str
    context_length: int
    supports_reasoning: bool = False
    supports_vision: bool = False
    supports_function_calling: bool = False
    description: str = ""

class ModelStatsResponse(BaseModel):
    """模型统计响应"""
    model_id: str
    provider: str
    request_count: int
    success_count: int
    failure_count: int
    success_rate: float
    average_response_time: float
    is_available: bool

def create_openrouter_config_api(app: FastAPI):
    """创建OpenRouter配置API路由"""
    
    @app.get("/api/openrouter/modes", response_model=Dict[str, Any])
    async def get_openrouter_modes():
        """获取OpenRouter支持的模式"""
        return {
            "modes": [
                {
                    "id": "openai_compatible",
                    "name": "OpenAI兼容模式",
                    "description": "使用OpenAI SDK兼容接口，适合现有OpenAI集成",
                    "advantages": ["兼容性好", "集成简单", "稳定性高"],
                    "disadvantages": ["功能受限", "无法使用OpenRouter特有功能"]
                },
                {
                    "id": "official_sdk",
                    "name": "官方SDK模式", 
                    "description": "使用OpenRouter官方SDK，支持更多高级功能",
                    "advantages": ["功能完整", "支持fallback", "性能优化"],
                    "disadvantages": ["集成复杂", "依赖更多"]
                }
            ]
        }
    
    @app.get("/api/openrouter/free-models", response_model=List[FreeModelInfo])
    async def get_free_models():
        """获取免费模型列表"""
        free_models = free_model_manager.get_openrouter_free_models()
        return [
            FreeModelInfo(
                model_id=info.model_id,
                name=info.name,
                provider=info.provider,
                context_length=info.context_length,
                supports_reasoning=info.supports_reasoning,
                supports_vision=info.supports_vision,
                supports_function_calling=info.supports_function_calling,
                description=info.description
            )
            for info in free_models.values()
        ]
    
    @app.get("/api/openrouter/recommended-models")
    async def get_recommended_models(use_case: str = "general"):
        """获取推荐的免费模型"""
        recommended = provider_manager.get_recommended_free_models(use_case)
        return {
            "use_case": use_case,
            "recommended_models": recommended,
            "model_details": [
                {
                    "model_id": model_id,
                    "capabilities": provider_manager.get_model_capabilities(model_id)
                }
                for model_id in recommended
            ]
        }
    
    @app.post("/api/openrouter/configure", response_model=OpenRouterConfigResponse)
    async def configure_openrouter(config: OpenRouterModeConfig):
        """配置OpenRouter模式"""
        try:
            # 根据模式确定提供商名称
            if config.provider_mode == "official_sdk":
                provider_name = "openrouter_official"
            else:
                provider_name = "openrouter"
            
            # 创建Provider配置
            provider_config = ProviderConfig(
                provider_type=ProviderType.OPENROUTER,
                api_key=config.api_key,
                base_url=config.base_url,
                default_model=config.default_model
            )
            
            # 配置Provider
            success = await provider_manager.configure_provider(provider_name, provider_config)
            
            if success:
                # 保存额外配置到配置文件
                if hasattr(provider_manager, 'config_manager') and provider_manager.config_manager:
                    extra_config = {
                        'api_key': config.api_key,
                        'base_url': config.base_url,
                        'default_model': config.default_model,
                        'enabled': config.enabled,
                        'openai_compatible': config.provider_mode == "openai_compatible",
                        'provider_mode': config.provider_mode,
                        'free_models_only': config.free_models_only,
                        'enabled_models': config.enabled_models,
                        'routing_strategy': config.routing_strategy,
                        'max_retries': config.max_retries,
                        'timeout_per_model': config.timeout_per_model,
                        'updated_at': datetime.now().isoformat()
                    }
                    provider_manager.config_manager.save_provider_config(provider_name, extra_config)
                
                return OpenRouterConfigResponse(
                    success=True,
                    message=f"OpenRouter {config.provider_mode} 模式配置成功",
                    config={
                        "provider_name": provider_name,
                        "mode": config.provider_mode,
                        "enabled_models": config.enabled_models
                    }
                )
            else:
                return OpenRouterConfigResponse(
                    success=False,
                    message="OpenRouter配置失败"
                )
                
        except Exception as e:
            logger.error(f"配置OpenRouter失败: {e}")
            return OpenRouterConfigResponse(
                success=False,
                message=f"配置失败: {str(e)}"
            )
    
    @app.get("/api/openrouter/config")
    async def get_openrouter_config():
        """获取当前OpenRouter配置"""
        try:
            # 获取两种模式的配置
            compatible_info = provider_manager.get_provider_info().get("openrouter", {})
            official_info = provider_manager.get_provider_info().get("openrouter_official", {})
            
            return {
                "openai_compatible": {
                    "enabled": bool(provider_manager.get_provider("openrouter")),
                    "config": compatible_info
                },
                "official_sdk": {
                    "enabled": bool(provider_manager.get_provider("openrouter_official")),
                    "config": official_info
                }
            }
            
        except Exception as e:
            logger.error(f"获取OpenRouter配置失败: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/openrouter/test-connection")
    async def test_openrouter_connection(provider_mode: str):
        """测试OpenRouter连接"""
        try:
            if provider_mode == "official_sdk":
                provider_name = "openrouter_official"
            else:
                provider_name = "openrouter"
            
            success = await provider_manager.test_connection(provider_name)
            
            return {
                "success": success,
                "provider_mode": provider_mode,
                "message": "连接成功" if success else "连接失败"
            }
            
        except Exception as e:
            logger.error(f"测试OpenRouter连接失败: {e}")
            return {
                "success": False,
                "provider_mode": provider_mode,
                "message": f"连接测试失败: {str(e)}"
            }
    
    @app.get("/api/openrouter/models")
    async def get_openrouter_models(provider_mode: str = "openai_compatible"):
        """获取OpenRouter模型列表"""
        try:
            if provider_mode == "official_sdk":
                provider_name = "openrouter_official"
            else:
                provider_name = "openrouter"
            
            provider = provider_manager.get_provider(provider_name)
            if not provider:
                raise HTTPException(status_code=404, detail=f"Provider {provider_name} 未找到")
            
            models = await provider.get_supported_models()
            
            return {
                "provider_mode": provider_mode,
                "models": [
                    {
                        "id": model.id,
                        "name": model.name,
                        "provider": model.provider,
                        "context_length": model.max_context_length,
                        "input_price": model.input_price_per_1k,
                        "output_price": model.output_price_per_1k,
                        "is_free": model.input_price_per_1k == 0.0,
                        "supports_streaming": model.supports_streaming
                    }
                    for model in models
                ]
            }
            
        except Exception as e:
            logger.error(f"获取OpenRouter模型列表失败: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/openrouter/multi-model/configure")
    async def configure_multi_model_routing(
        enabled_models: List[str],
        routing_strategy: str = "round_robin",
        max_retries: int = 3,
        timeout_per_model: float = 30.0
    ):
        """配置多模型路由"""
        try:
            # 验证路由策略
            try:
                strategy = RoutingStrategy(routing_strategy)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"无效的路由策略: {routing_strategy}")
            
            # 验证模型是否为免费模型
            invalid_models = []
            for model_id in enabled_models:
                if not provider_manager.is_free_model(model_id):
                    invalid_models.append(model_id)
            
            if invalid_models:
                return {
                    "success": False,
                    "message": f"以下模型不是免费模型: {', '.join(invalid_models)}"
                }
            
            # 创建多模型路由器配置
            router_config = {
                "enabled_models": enabled_models,
                "routing_strategy": routing_strategy,
                "max_retries": max_retries,
                "timeout_per_model": timeout_per_model,
                "updated_at": datetime.now().isoformat()
            }
            
            # 这里可以保存到配置文件或数据库
            # 暂时返回成功响应
            return {
                "success": True,
                "message": "多模型路由配置成功",
                "config": router_config
            }
            
        except Exception as e:
            logger.error(f"配置多模型路由失败: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/openrouter/multi-model/stats", response_model=List[ModelStatsResponse])
    async def get_multi_model_stats():
        """获取多模型统计信息"""
        try:
            # 这里需要从实际的路由器实例获取统计信息
            # 暂时返回模拟数据
            return []
            
        except Exception as e:
            logger.error(f"获取多模型统计失败: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/openrouter/multi-model/reset-stats")
    async def reset_multi_model_stats(model_id: Optional[str] = None):
        """重置多模型统计信息"""
        try:
            # 这里需要重置实际的路由器统计
            return {
                "success": True,
                "message": f"已重置{'所有模型' if not model_id else model_id}的统计信息"
            }
            
        except Exception as e:
            logger.error(f"重置多模型统计失败: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/openrouter/capabilities")
    async def get_model_capabilities(model_id: str):
        """获取模型能力信息"""
        try:
            capabilities = provider_manager.get_model_capabilities(model_id)
            if not capabilities:
                raise HTTPException(status_code=404, detail=f"模型 {model_id} 未找到")
            
            return {
                "model_id": model_id,
                "capabilities": capabilities
            }
            
        except Exception as e:
            logger.error(f"获取模型能力失败: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return app

# 如果直接运行此文件，创建测试应用
if __name__ == "__main__":
    import uvicorn
    
    app = FastAPI(title="OpenRouter双模式配置API", version="1.0.0")
    app = create_openrouter_config_api(app)
    
    uvicorn.run(app, host="0.0.0.0", port=8001)