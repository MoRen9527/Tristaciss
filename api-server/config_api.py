from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import json
import os
# 简化导入，避免模块依赖问题
import logging

router = APIRouter(prefix="/api/config", tags=["config"])

class ProviderConfig(BaseModel):
    name: str
    display_name: str
    enabled: bool
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    models: List[str] = []
    default_model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    supports_streaming: bool = True
    supports_function_calling: bool = False

class ConfigResponse(BaseModel):
    providers: Dict[str, ProviderConfig]
    active_provider: str
    global_settings: Dict[str, Any]

# 配置文件路径
CONFIG_FILE = "config/providers.json"

def load_config() -> Dict[str, Any]:
    """加载配置文件"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return get_default_config()

def load_providers_config():
    """加载提供商配置文件"""
    config_path = os.path.join(os.path.dirname(__file__), "provider_configs.json")
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def load_providers_config_v2():
    """加载提供商配置文件v2"""
    config_path = os.path.join(os.path.dirname(__file__), "providers_config.json")
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_config(config: Dict[str, Any]) -> None:
    """保存配置文件"""
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

def get_default_config() -> Dict[str, Any]:
    """获取默认配置"""
    return {
        "providers": {
            "openai": {
                "name": "openai",
                "display_name": "OpenAI",
                "enabled": True,
                "api_key": "",
                "base_url": "https://api.openai.com/v1",
                "models": [
                    "gpt-4o",
                    "gpt-4o-mini", 
                    "gpt-4-turbo",
                    "gpt-3.5-turbo"
                ],
                "default_model": "gpt-4o-mini",
                "max_tokens": 4096,
                "temperature": 0.7,
                "supports_streaming": True,
                "supports_function_calling": True
            },
            "anthropic": {
                "name": "anthropic",
                "display_name": "Anthropic",
                "enabled": True,
                "api_key": "",
                "base_url": "https://api.anthropic.com",
                "models": [
                    "claude-3-5-sonnet-20241022",
                    "claude-3-5-haiku-20241022",
                    "claude-3-opus-20240229"
                ],
                "default_model": "claude-3-5-sonnet-20241022",
                "max_tokens": 4096,
                "temperature": 0.7,
                "supports_streaming": True,
                "supports_function_calling": True
            },
            "deepseek": {
                "name": "deepseek",
                "display_name": "DeepSeek",
                "enabled": True,
                "api_key": "",
                "base_url": "https://api.deepseek.com/v1",
                "models": [
                    "deepseek-chat",
                    "deepseek-coder"
                ],
                "default_model": "deepseek-chat",
                "max_tokens": 4096,
                "temperature": 0.7,
                "supports_streaming": True,
                "supports_function_calling": True
            },
            "openrouter": {
                "name": "openrouter",
                "display_name": "OpenRouter",
                "enabled": True,
                "api_key": "",
                "base_url": "https://openrouter.ai/api/v1",
                "models": [
                    "gpt-4o",
                    "claude-3-5-sonnet-20241022",
                    "llama-3.1-405b-instruct"
                ],
                "default_model": "gpt-4o",
                "max_tokens": 4096,
                "temperature": 0.7,
                "supports_streaming": True,
                "supports_function_calling": True
            },
            "modelscope": {
                "name": "modelscope",
                "display_name": "ModelScope",
                "enabled": True,
                "api_key": "",
                "base_url": "https://dashscope.aliyuncs.com/api/v1",
                "models": [
                    "qwen2.5-72b-instruct",
                    "qwen2.5-32b-instruct",
                    "glm-4-plus"
                ],
                "default_model": "qwen2.5-72b-instruct",
                "max_tokens": 4096,
                "temperature": 0.7,
                "supports_streaming": True,
                "supports_function_calling": True
            }
        },
        "active_provider": "openai",
        "global_settings": {
            "theme": "light",
            "language": "zh-CN",
            "auto_save": True,
            "max_history": 100
        }
    }

@router.get("/", response_model=ConfigResponse)
async def get_config():
    """获取完整配置"""
    try:
        config = load_config()
        return ConfigResponse(**config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取配置失败: {str(e)}")

@router.get("/providers")
async def get_providers():
    """获取所有提供商配置"""
    try:
        config = load_config()
        providers = config.get("providers", {})
        
        # 为每个提供商添加免费模型信息
        for provider_name, provider_info in providers.items():
            if 'models' in provider_info:
                free_models = []
                for model in provider_info['models']:
                    # 检查是否为免费模型（包含:free后缀）
                    if ':free' in model:
                        free_models.append(model)
                provider_info['free_models'] = free_models
                
        return providers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取提供商配置失败: {str(e)}")

@router.get("/providers/{provider_name}")
async def get_provider_config(provider_name: str):
    """获取特定提供商配置"""
    try:
        config = load_config()
        providers = config.get("providers", {})
        if provider_name not in providers:
            raise HTTPException(status_code=404, detail=f"提供商 {provider_name} 不存在")
        return providers[provider_name]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取提供商配置失败: {str(e)}")

@router.put("/providers/{provider_name}")
async def update_provider_config(provider_name: str, provider_config: ProviderConfig):
    """更新特定提供商配置"""
    try:
        config = load_config()
        if "providers" not in config:
            config["providers"] = {}
        
        config["providers"][provider_name] = provider_config.dict()
        save_config(config)
        
        return {"message": f"提供商 {provider_name} 配置更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新提供商配置失败: {str(e)}")

@router.put("/active-provider")
async def set_active_provider(provider_name: str):
    """设置活跃提供商"""
    try:
        config = load_config()
        providers = config.get("providers", {})
        
        if provider_name not in providers:
            raise HTTPException(status_code=404, detail=f"提供商 {provider_name} 不存在")
        
        if not providers[provider_name].get("enabled", False):
            raise HTTPException(status_code=400, detail=f"提供商 {provider_name} 未启用")
        
        config["active_provider"] = provider_name
        save_config(config)
        
        return {"message": f"活跃提供商设置为 {provider_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"设置活跃提供商失败: {str(e)}")

@router.get("/models/{provider_name}")
async def get_provider_models(provider_name: str):
    """获取提供商支持的模型列表"""
    try:
        config = load_config()
        providers = config.get("providers", {})
        
        if provider_name not in providers:
            raise HTTPException(status_code=404, detail=f"提供商 {provider_name} 不存在")
        
        return providers[provider_name].get("models", [])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模型列表失败: {str(e)}")

@router.post("/validate/{provider_name}")
async def validate_provider_config(provider_name: str, provider_config: ProviderConfig):
    """验证提供商配置"""
    try:
        # 这里可以添加实际的API密钥验证逻辑
        if not provider_config.api_key:
            raise HTTPException(status_code=400, detail="API密钥不能为空")
        
        # 根据提供商类型进行特定验证
        if provider_name == "openai":
            # 验证OpenAI配置
            if not provider_config.base_url:
                provider_config.base_url = "https://api.openai.com/v1"
        elif provider_name == "anthropic":
            # 验证Anthropic配置
            if not provider_config.base_url:
                provider_config.base_url = "https://api.anthropic.com"
        
        return {"valid": True, "message": "配置验证成功"}
    except HTTPException:
        raise
    except Exception as e:
        return {"valid": False, "message": f"配置验证失败: {str(e)}"}

@router.put("/global-settings")
async def update_global_settings(settings: Dict[str, Any]):
    """更新全局设置"""
    try:
        config = load_config()
        config["global_settings"] = {**config.get("global_settings", {}), **settings}
        save_config(config)
        
        return {"message": "全局设置更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新全局设置失败: {str(e)}")

@router.post("/reset")
async def reset_config():
    """重置配置为默认值"""
    try:
        default_config = get_default_config()
        save_config(default_config)
        return {"message": "配置已重置为默认值"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重置配置失败: {str(e)}")

