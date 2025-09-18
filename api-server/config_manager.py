"""
配置管理器 - 临时解决方案
处理前后端配置同步，为数据库迁移做准备
"""

import json
import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_file: str = "provider_configs.json"):
        """
        初始化配置管理器
        
        Args:
            config_file: 配置文件路径
        """
        self.config_file = Path(config_file)
        self.configs = {}
        self._load_configs()
    
    def _load_configs(self):
        """加载配置文件"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    self.configs = json.load(f)
                logger.info(f"已加载配置文件: {self.config_file}")
            else:
                logger.info("配置文件不存在，使用空配置")
                self.configs = {}
        except Exception as e:
            logger.error(f"加载配置文件失败: {e}")
            self.configs = {}
    
    def _save_configs(self):
        """保存配置到文件"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.configs, f, indent=2, ensure_ascii=False)
            logger.info(f"配置已保存到: {self.config_file}")
        except Exception as e:
            logger.error(f"保存配置文件失败: {e}")
    
    def get_provider_config(self, provider_name: str) -> Optional[Dict[str, Any]]:
        """获取指定提供商的配置"""
        return self.configs.get("providers", {}).get(provider_name)
    
    def get_all_provider_configs(self) -> Dict[str, Any]:
        """获取所有提供商配置"""
        return self.configs.get("providers", {})
    
    def delete_provider_config(self, provider_name: str) -> bool:
        """删除提供商配置"""
        try:
            if "providers" in self.configs and provider_name in self.configs["providers"]:
                del self.configs["providers"][provider_name]
                self._save_configs()
                logger.info(f"提供商 {provider_name} 配置已删除")
                return True
            return False
        except Exception as e:
            logger.error(f"删除提供商 {provider_name} 配置失败: {e}")
            return False
    
    def save_provider_config(self, provider_name: str, config: Dict[str, Any]) -> bool:
        """
        保存Provider配置
        
        Args:
            provider_name: Provider名称
            config: 配置数据
            
        Returns:
            bool: 保存是否成功
        """
        try:
            if 'providers' not in self.configs:
                self.configs['providers'] = {}
            
            self.configs['providers'][provider_name] = {
                'api_key': config.get('api_key', ''),
                'base_url': config.get('base_url', ''),
                'default_model': config.get('default_model', ''),
                'enabled': config.get('enabled', False),
                'openai_compatible': config.get('openai_compatible', False),
                'enabled_models': config.get('enabled_models', []),
                'updated_at': datetime.now().isoformat()
            }
            
            self._save_configs()
            logger.info(f"已保存Provider配置: {provider_name}")
            return True
            
        except Exception as e:
            logger.error(f"保存Provider配置失败 - {provider_name}: {e}")
            return False
    
    def get_provider_config(self, provider_name: str) -> Optional[Dict[str, Any]]:
        """
        获取Provider配置
        
        Args:
            provider_name: Provider名称
            
        Returns:
            Optional[Dict[str, Any]]: 配置数据
        """
        return self.configs.get('providers', {}).get(provider_name)
    
    def get_all_provider_configs(self) -> Dict[str, Dict[str, Any]]:
        """
        获取所有Provider配置
        
        Returns:
            Dict[str, Dict[str, Any]]: 所有配置数据
        """
        return self.configs.get('providers', {})
    
    def delete_provider_config(self, provider_name: str) -> bool:
        """
        删除Provider配置
        
        Args:
            provider_name: Provider名称
            
        Returns:
            bool: 删除是否成功
        """
        try:
            if 'providers' in self.configs and provider_name in self.configs['providers']:
                del self.configs['providers'][provider_name]
                self._save_configs()
                logger.info(f"已删除Provider配置: {provider_name}")
                return True
            return False
        except Exception as e:
            logger.error(f"删除Provider配置失败 - {provider_name}: {e}")
            return False

# 全局配置管理器实例
config_manager = ConfigManager()