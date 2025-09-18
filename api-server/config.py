import os
import json
from typing import Dict, Any, List, Optional

class Config:
    def __init__(self):
        # API配置
        self.api_host = os.getenv('API_HOST', '0.0.0.0')
        self.api_port = int(os.getenv('API_PORT', 8000))
        
        # 数据库配置
        self.database_url = os.getenv('DATABASE_URL', 'sqlite:///./app.db')
        
        # 其他配置
        self.debug = os.getenv('DEBUG', 'False').lower() == 'true'
        
        # 模型提供商配置
        self.providers_config_file = 'providers_config.json'
        self.load_providers_config()
    
    def load_providers_config(self):
        """加载提供商配置"""
        try:
            if os.path.exists(self.providers_config_file):
                with open(self.providers_config_file, 'r', encoding='utf-8') as f:
                    self.providers_config = json.load(f)
            else:
                self.providers_config = self.get_default_providers_config()
                self.save_providers_config()
        except Exception as e:
            print(f"加载提供商配置失败: {e}")
            self.providers_config = self.get_default_providers_config()
    
    def save_providers_config(self):
        """保存提供商配置"""
        try:
            with open(self.providers_config_file, 'w', encoding='utf-8') as f:
                json.dump(self.providers_config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存提供商配置失败: {e}")
    
    def get_default_providers_config(self):
        """获取默认提供商配置"""
        return {
            "deepseek": {
                "enabled": False,
                "api_key": "",
                "base_url": "https://api.deepseek.com/v1",
                "models": [
                    {"id": "deepseek-chat", "name": "DeepSeek Chat"},
                    {"id": "deepseek-coder", "name": "DeepSeek Coder"}
                ],
                "selected_model": "deepseek-chat"
            },
            "glm": {
                "enabled": False,
                "api_key": "",
                "base_url": "https://open.bigmodel.cn/api/paas/v4",
                "models": [
                    {"id": "glm-4", "name": "GLM-4"},
                    {"id": "glm-4-flash", "name": "GLM-4 Flash"},
                    {"id": "glm-3-turbo", "name": "GLM-3 Turbo"}
                ],
                "selected_model": "glm-4"
            },
            "qwen": {
                "enabled": False,
                "api_key": "",
                "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
                "models": [
                    {"id": "qwen-turbo", "name": "Qwen Turbo"},
                    {"id": "qwen-plus", "name": "Qwen Plus"},
                    {"id": "qwen-max", "name": "Qwen Max"}
                ],
                "selected_model": "qwen-turbo"
            },
            "moonshot": {
                "enabled": False,
                "api_key": "",
                "base_url": "https://api.moonshot.cn/v1",
                "models": [
                    {"id": "moonshot-v1-8k", "name": "Moonshot v1 8K"},
                    {"id": "moonshot-v1-32k", "name": "Moonshot v1 32K"},
                    {"id": "moonshot-v1-128k", "name": "Moonshot v1 128K"}
                ],
                "selected_model": "moonshot-v1-8k"
            }
        }
    
    def update_provider_config(self, provider_name: str, config_data: Dict[str, Any]):
        """更新提供商配置"""
        if provider_name in self.providers_config:
            self.providers_config[provider_name].update(config_data)
            self.save_providers_config()
            return True
        return False
    
    def get_enabled_providers(self):
        """获取已启用的提供商"""
        return {name: config for name, config in self.providers_config.items() if config.get('enabled', False)}
    
    def get_available_models(self):
        """获取所有可用模型"""
        models = []
        for provider_name, config in self.providers_config.items():
            # 只要启用就返回模型，不强制要求API密钥（用于演示）
            if config.get('enabled', False):
                for model in config.get('models', []):
                    models.append({
                        'id': f"{provider_name}:{model['id']}",
                        'name': f"{model['name']} ({provider_name.upper()})",
                        'provider': provider_name,
                        'model_id': model['id']
                    })
        return models
    
    def get_current_model(self):
        """获取当前选中的模型"""
        enabled_providers = self.get_enabled_providers()
        if enabled_providers:
            # 返回第一个启用的提供商的选中模型
            provider_name = list(enabled_providers.keys())[0]
            provider_config = enabled_providers[provider_name]
            return {
                'provider': provider_name,
                'model_id': provider_config.get('selected_model'),
                'model_name': next((m['name'] for m in provider_config.get('models', []) 
                                  if m['id'] == provider_config.get('selected_model')), 
                                 provider_config.get('selected_model'))
            }
        return None

config = Config()