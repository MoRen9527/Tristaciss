"""
配置指令处理器 - 按照README架构实现
统一处理所有配置相关的指令，以后端配置为权威源
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
from config_manager import ConfigManager

logger = logging.getLogger(__name__)

class ConfigCommandHandler:
    """配置指令处理器"""
    
    def __init__(self, config_manager: ConfigManager, provider_manager=None):
        self.config_manager = config_manager
        self.provider_manager = provider_manager
        logger.info("配置指令处理器初始化完成")
    
    async def handle_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """
        统一处理配置指令
        
        Args:
            command: 配置指令，包含type、data等字段
            
        Returns:
            处理结果，包含success、data、error等字段
        """
        try:
            command_type = command.get('type', '').upper()
            request_id = command.get('requestId', 'unknown')
            
            logger.info(f"处理配置指令: {command_type} [ID: {request_id}]")
            
            # 根据指令类型分发处理
            if command_type == 'GET_PROVIDERS':
                return await self._handle_get_providers(command)
            elif command_type == 'GET_PROVIDER_CONFIG':
                return await self._handle_get_provider_config(command)
            elif command_type == 'UPDATE_PROVIDER_CONFIG':
                return await self._handle_update_provider_config(command)
            elif command_type == 'DELETE_PROVIDER_CONFIG':
                return await self._handle_delete_provider_config(command)
            elif command_type == 'GET_ALL_CONFIGS':
                return await self._handle_get_all_configs(command)
            elif command_type == 'RESET_CONFIG':
                return await self._handle_reset_config(command)
            elif command_type == 'VALIDATE_CONFIG':
                return await self._handle_validate_config(command)
            else:
                return {
                    "success": False,
                    "error": f"未知的配置指令类型: {command_type}",
                    "timestamp": datetime.now().isoformat(),
                    "requestId": request_id
                }
                
        except Exception as e:
            logger.error(f"配置指令处理异常: {e}")
            return {
                "success": False,
                "error": f"指令处理异常: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId', 'unknown')
            }
    
    async def _handle_get_providers(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """获取所有可用的providers"""
        try:
            providers = self.provider_manager.get_all_providers()
            
            # 为每个provider添加配置状态
            provider_list = []
            for provider_name, provider_info in providers.items():
                config = self.config_manager.get_provider_config(provider_name)
                provider_list.append({
                    "name": provider_name,
                    "info": provider_info,
                    "configured": config is not None,
                    "config": config if config else {}
                })
            
            return {
                "success": True,
                "data": {
                    "providers": provider_list,
                    "total": len(provider_list)
                },
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
            
        except Exception as e:
            logger.error(f"获取providers失败: {e}")
            return {
                "success": False,
                "error": f"获取providers失败: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
    
    async def _handle_get_provider_config(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """获取特定provider的配置"""
        try:
            provider_name = command.get('data', {}).get('provider')
            if not provider_name:
                return {
                    "success": False,
                    "error": "缺少provider名称",
                    "timestamp": datetime.now().isoformat(),
                    "requestId": command.get('requestId')
                }
            
            config = self.config_manager.get_provider_config(provider_name)
            
            return {
                "success": True,
                "data": {
                    "provider": provider_name,
                    "config": config if config else {},
                    "configured": config is not None
                },
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
            
        except Exception as e:
            logger.error(f"获取provider配置失败: {e}")
            return {
                "success": False,
                "error": f"获取provider配置失败: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
    
    async def _handle_update_provider_config(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """更新provider配置"""
        try:
            data = command.get('data', {})
            provider_name = data.get('provider')
            config_data = data.get('config', {})
            
            if not provider_name:
                return {
                    "success": False,
                    "error": "缺少provider名称",
                    "timestamp": datetime.now().isoformat(),
                    "requestId": command.get('requestId')
                }
            
            # 验证provider是否存在（如果有provider_manager的话）
            if self.provider_manager and self.provider_manager.get_provider(provider_name) is None:
                # 对于未知的provider，我们仍然允许保存配置
                logger.warning(f"Provider {provider_name} 在provider_manager中不存在，但仍允许保存配置")
            
            # 保存配置
            success = self.config_manager.save_provider_config(provider_name, config_data)
            
            if success:
                logger.info(f"Provider {provider_name} 配置更新成功")
                return {
                    "success": True,
                    "data": {
                        "provider": provider_name,
                        "config": config_data,
                        "message": f"Provider {provider_name} 配置更新成功"
                    },
                    "timestamp": datetime.now().isoformat(),
                    "requestId": command.get('requestId')
                }
            else:
                return {
                    "success": False,
                    "error": "配置保存失败",
                    "timestamp": datetime.now().isoformat(),
                    "requestId": command.get('requestId')
                }
                
        except Exception as e:
            logger.error(f"更新provider配置失败: {e}")
            return {
                "success": False,
                "error": f"更新provider配置失败: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
    
    async def _handle_delete_provider_config(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """删除provider配置"""
        try:
            provider_name = command.get('data', {}).get('provider')
            if not provider_name:
                return {
                    "success": False,
                    "error": "缺少provider名称",
                    "timestamp": datetime.now().isoformat(),
                    "requestId": command.get('requestId')
                }
            
            success = self.config_manager.delete_provider_config(provider_name)
            
            if success:
                logger.info(f"Provider {provider_name} 配置删除成功")
                return {
                    "success": True,
                    "data": {
                        "provider": provider_name,
                        "message": f"Provider {provider_name} 配置删除成功"
                    },
                    "timestamp": datetime.now().isoformat(),
                    "requestId": command.get('requestId')
                }
            else:
                return {
                    "success": False,
                    "error": "配置删除失败",
                    "timestamp": datetime.now().isoformat(),
                    "requestId": command.get('requestId')
                }
                
        except Exception as e:
            logger.error(f"删除provider配置失败: {e}")
            return {
                "success": False,
                "error": f"删除provider配置失败: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
    
    async def _handle_get_all_configs(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """获取所有配置"""
        try:
            all_configs = self.config_manager.get_all_provider_configs()
            
            return {
                "success": True,
                "data": {
                    "configs": all_configs,
                    "total": len(all_configs)
                },
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
            
        except Exception as e:
            logger.error(f"获取所有配置失败: {e}")
            return {
                "success": False,
                "error": f"获取所有配置失败: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
    
    async def _handle_reset_config(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """重置配置"""
        try:
            provider_name = command.get('data', {}).get('provider')
            
            if provider_name:
                # 重置特定provider的配置
                success = self.config_manager.delete_provider_config(provider_name)
                message = f"Provider {provider_name} 配置重置成功" if success else "配置重置失败"
            else:
                # 重置所有配置
                success = self.config_manager.reset_all_configs()
                message = "所有配置重置成功" if success else "配置重置失败"
            
            return {
                "success": success,
                "data": {"message": message} if success else None,
                "error": message if not success else None,
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
            
        except Exception as e:
            logger.error(f"重置配置失败: {e}")
            return {
                "success": False,
                "error": f"重置配置失败: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
    
    async def _handle_validate_config(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """验证配置"""
        try:
            data = command.get('data', {})
            provider_name = data.get('provider')
            config_data = data.get('config', {})
            
            if not provider_name:
                return {
                    "success": False,
                    "error": "缺少provider名称",
                    "timestamp": datetime.now().isoformat(),
                    "requestId": command.get('requestId')
                }
            
            # 验证provider是否存在（如果有provider_manager的话）
            if self.provider_manager and self.provider_manager.get_provider(provider_name) is None:
                logger.warning(f"Provider {provider_name} 在provider_manager中不存在，但仍允许验证配置")
            
            # 这里可以添加更详细的配置验证逻辑
            # 比如验证API密钥格式、必填字段等
            
            validation_result = {
                "valid": True,
                "errors": [],
                "warnings": []
            }
            
            # 基本验证
            if provider_name in ['openai', 'anthropic'] and not config_data.get('api_key'):
                validation_result["valid"] = False
                validation_result["errors"].append("API密钥不能为空")
            
            return {
                "success": True,
                "data": {
                    "provider": provider_name,
                    "validation": validation_result
                },
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }
            
        except Exception as e:
            logger.error(f"验证配置失败: {e}")
            return {
                "success": False,
                "error": f"验证配置失败: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "requestId": command.get('requestId')
            }