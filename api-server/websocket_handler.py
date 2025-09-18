#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import json
import logging
import uuid
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
from dataclasses import dataclass, asdict
from fastapi import WebSocket, WebSocketDisconnect

# 导入提供商管理器
from providers import ProviderManager, ProviderError

logger = logging.getLogger(__name__)

@dataclass
class ChatMessage:
    """聊天消息数据类"""
    role: str  # 'user', 'assistant', 'system'
    content: str
    timestamp: datetime
    model_id: Optional[str] = None
    model_name: Optional[str] = None

@dataclass
class GroupChatSession:
    """群聊会话数据类"""
    session_id: str
    models: List[Dict[str, Any]]
    system_prompts: Dict[str, Any]
    created_at: datetime
    messages: List[ChatMessage] = None
    
    def __post_init__(self):
        if self.messages is None:
            self.messages = []

class ConnectionManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.group_sessions: Dict[str, GroupChatSession] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """建立WebSocket连接"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket连接建立: {session_id}")
    
    def disconnect(self, session_id: str):
        """断开WebSocket连接"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.group_sessions:
            del self.group_sessions[session_id]
        logger.info(f"WebSocket连接断开: {session_id}")
    
    async def send_message(self, session_id: str, message: dict):
        """发送消息到指定会话"""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                logger.error(f"发送消息失败 {session_id}: {e}")
                self.disconnect(session_id)

class ContextService:
    """上下文管理服务"""
    
    def __init__(self):
        # 存储会话的共享上下文
        self.shared_contexts: Dict[str, List[ChatMessage]] = {}
        # 存储各模型的系统提示词
        self.model_system_prompts: Dict[str, Dict[str, str]] = {}
        # 存储模型的上下文限制
        self.model_limits: Dict[str, int] = {
            'gpt-4': 8192,
            'gpt-3.5-turbo': 4096,
            'claude-3-sonnet': 100000,
            'gemini-pro': 32768,
            'deepseek-chat': 32768,
            'qwen-turbo': 8192,
        }
    
    async def initialize_model_context(self, session_id: str, model_id: str, system_prompts: dict):
        """初始化模型上下文"""
        if session_id not in self.shared_contexts:
            self.shared_contexts[session_id] = []
        
        if session_id not in self.model_system_prompts:
            self.model_system_prompts[session_id] = {}
        
        # 设置系统提示词
        if system_prompts.get('mode') == 'unified':
            prompt = system_prompts.get('prompt', '')
        else:
            prompt = system_prompts.get('prompts', {}).get(model_id, '')
        
        self.model_system_prompts[session_id][model_id] = prompt
    
    async def add_message(self, session_id: str, message: ChatMessage):
        """添加消息到共享上下文"""
        if session_id not in self.shared_contexts:
            self.shared_contexts[session_id] = []
        
        self.shared_contexts[session_id].append(message)
        
        # 清理过长的上下文（保留最近的消息）
        await self.cleanup_context(session_id)
    
    async def get_model_context(self, session_id: str, model_id: str) -> List[dict]:
        """获取特定模型的上下文"""
        if session_id not in self.shared_contexts:
            return []
        
        messages = []
        
        # 添加系统提示词
        system_prompt = self.model_system_prompts.get(session_id, {}).get(model_id, '')
        if system_prompt:
            messages.append({
                'role': 'system',
                'content': system_prompt
            })
        
        # 添加共享上下文消息
        shared_messages = self.shared_contexts[session_id]
        for msg in shared_messages:
            messages.append({
                'role': msg.role,
                'content': msg.content
            })
        
        # 根据模型限制裁剪上下文
        return await self.trim_context_for_model(model_id, messages)
    
    async def trim_context_for_model(self, model_id: str, messages: List[dict]) -> List[dict]:
        """根据模型限制裁剪上下文"""
        max_tokens = self.model_limits.get(model_id, 4096)
        
        # 保留系统消息
        system_messages = [msg for msg in messages if msg['role'] == 'system']
        other_messages = [msg for msg in messages if msg['role'] != 'system']
        
        # 简单的token计算（实际应该使用tokenizer）
        def count_tokens(text: str) -> int:
            return len(text.split()) * 1.3  # 粗略估算
        
        # 计算系统消息的token数
        system_tokens = sum(count_tokens(msg['content']) for msg in system_messages)
        available_tokens = max_tokens - system_tokens - 500  # 预留500tokens给响应
        
        if available_tokens <= 0:
            return system_messages
        
        # 从最新消息开始，逐步添加到上下文中
        selected_messages = []
        current_tokens = 0
        
        for msg in reversed(other_messages):
            msg_tokens = count_tokens(msg['content'])
            if current_tokens + msg_tokens <= available_tokens:
                selected_messages.insert(0, msg)
                current_tokens += msg_tokens
            else:
                break
        
        return system_messages + selected_messages
    
    async def get_context_info(self, session_id: str) -> dict:
        """获取上下文信息"""
        if session_id not in self.shared_contexts:
            return {'total_tokens': 0, 'message_count': 0}
        
        messages = self.shared_contexts[session_id]
        # 简单的token计算
        total_tokens = sum(len(msg.content.split()) * 1.3 for msg in messages)
        
        return {
            'total_tokens': int(total_tokens),
            'message_count': len(messages)
        }
    
    async def get_model_context_usage(self, session_id: str, model_id: str) -> dict:
        """获取模型的上下文使用情况"""
        context = await self.get_model_context(session_id, model_id)
        used_tokens = sum(len(msg['content'].split()) * 1.3 for msg in context)
        max_tokens = self.model_limits.get(model_id, 4096)
        
        return {
            'used_tokens': int(used_tokens),
            'max_tokens': max_tokens,
            'usage_percent': (used_tokens / max_tokens) * 100 if max_tokens > 0 else 0
        }
    
    async def cleanup_context(self, session_id: str, max_messages: int = 100):
        """清理过长的上下文"""
        if session_id not in self.shared_contexts:
            return
        
        messages = self.shared_contexts[session_id]
        if len(messages) > max_messages:
            # 保留最近的消息
            self.shared_contexts[session_id] = messages[-max_messages:]
    
    def clear_session_context(self, session_id: str):
        """清除会话上下文"""
        if session_id in self.shared_contexts:
            del self.shared_contexts[session_id]
        if session_id in self.model_system_prompts:
            del self.model_system_prompts[session_id]

class GroupChatHandler:
    """群聊处理器"""
    
    def __init__(self, provider_manager: ProviderManager):
        self.connection_manager = ConnectionManager()
        self.context_service = ContextService()
        self.provider_manager = provider_manager
    
    async def handle_websocket(self, websocket: WebSocket, session_id: str):
        """处理WebSocket连接"""
        await self.connection_manager.connect(websocket, session_id)
        
        try:
            while True:
                # 接收消息
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # 处理不同类型的消息
                await self.handle_message(session_id, message)
                
        except WebSocketDisconnect:
            logger.info(f"WebSocket客户端断开连接: {session_id}")
            self.connection_manager.disconnect(session_id)
        except Exception as e:
            logger.error(f"WebSocket错误 {session_id}: {e}")
            self.connection_manager.disconnect(session_id)
    
    async def handle_message(self, session_id: str, message: dict):
        """处理接收到的消息"""
        message_type = message.get('type')
        data = message.get('data', {})
        
        try:
            if message_type == 'initialize_group_chat':
                await self.initialize_group_chat(session_id, data)
            elif message_type == 'user_message':
                await self.handle_user_message(session_id, data)
            else:
                logger.warning(f"未知消息类型: {message_type}")
        except Exception as e:
            logger.error(f"处理消息失败: {e}")
            await self.connection_manager.send_message(session_id, {
                'type': 'error',
                'message': f'处理消息失败: {str(e)}'
            })
    
    async def initialize_group_chat(self, session_id: str, data: dict):
        """初始化群聊会话"""
        try:
            models = data.get('models', [])
            system_prompts = data.get('systemPrompts', {})
            
            # 创建群聊会话
            session = GroupChatSession(
                session_id=session_id,
                models=models,
                system_prompts=system_prompts,
                created_at=datetime.now()
            )
            
            self.connection_manager.group_sessions[session_id] = session
            
            # 初始化各个模型的上下文
            for model in models:
                await self.context_service.initialize_model_context(
                    session_id, 
                    model['id'], 
                    system_prompts
                )
            
            # 发送初始化成功消息
            await self.connection_manager.send_message(session_id, {
                'type': 'initialization_complete',
                'data': {
                    'session_id': session_id,
                    'models': models
                }
            })
            
            # 发送初始上下文状态
            await self.send_context_update(session_id)
            
        except Exception as e:
            logger.error(f"初始化群聊失败: {e}")
            await self.connection_manager.send_message(session_id, {
                'type': 'error',
                'message': f'初始化群聊失败: {str(e)}'
            })
    
    async def handle_user_message(self, session_id: str, data: dict):
        """处理用户消息"""
        try:
            content = data.get('content', '').strip()
            if not content:
                return
            
            session = self.connection_manager.group_sessions.get(session_id)
            if not session:
                await self.connection_manager.send_message(session_id, {
                    'type': 'error',
                    'message': '群聊会话未初始化'
                })
                return
            
            # 创建用户消息
            user_message = ChatMessage(
                role='user',
                content=content,
                timestamp=datetime.now()
            )
            
            # 添加到共享上下文
            await self.context_service.add_message(session_id, user_message)
            
            # 发送上下文更新
            await self.send_context_update(session_id)
            
            # 并发处理所有模型的响应
            tasks = []
            for model in session.models:
                task = asyncio.create_task(
                    self.process_model_response(session_id, model, user_message)
                )
                tasks.append(task)
            
            # 等待所有模型响应完成
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            logger.error(f"处理用户消息失败: {e}")
            await self.connection_manager.send_message(session_id, {
                'type': 'error',
                'message': f'处理消息失败: {str(e)}'
            })
    
    async def process_model_response(self, session_id: str, model: dict, user_message: ChatMessage):
        """处理单个模型的响应"""
        try:
            model_id = model['id']
            model_name = model['name']
            provider = model['provider']
            
            # 更新模型状态为处理中
            await self.send_model_status_update(session_id, model_id, 'processing')
            
            # 获取模型的上下文
            context = await self.context_service.get_model_context(session_id, model_id)
            
            # 调用模型生成响应
            response_content = await self.call_model_api(provider, model_id, context)
            
            if response_content:
                # 创建AI响应消息
                ai_message = ChatMessage(
                    role='assistant',
                    content=response_content,
                    timestamp=datetime.now(),
                    model_id=model_id,
                    model_name=model_name
                )
                
                # 添加到共享上下文
                await self.context_service.add_message(session_id, ai_message)
                
                # 发送响应到前端
                await self.connection_manager.send_message(session_id, {
                    'type': 'model_response',
                    'content': response_content,
                    'modelId': model_id,
                    'modelName': model_name,
                    'timestamp': ai_message.timestamp.isoformat()
                })
                
                # 更新上下文状态
                await self.send_context_update(session_id)
            
            # 更新模型状态为活跃
            await self.send_model_status_update(session_id, model_id, 'active')
            
        except Exception as e:
            logger.error(f"模型 {model['id']} 响应失败: {e}")
            await self.send_model_status_update(session_id, model['id'], 'error')
            await self.connection_manager.send_message(session_id, {
                'type': 'model_error',
                'modelId': model['id'],
                'modelName': model['name'],
                'error': str(e)
            })
    
    async def call_model_api(self, provider: str, model_id: str, context: List[dict]) -> str:
        """调用模型API"""
        try:
            # 使用提供商管理器调用模型
            from config_manager import config_manager
            
            # 获取提供商配置
            provider_config = config_manager.get_provider_config(provider)
            if not provider_config or not provider_config.get('enabled'):
                raise Exception(f"提供商 {provider} 未配置或未启用")
            
            # 构造请求参数
            request_data = {
                'messages': context,
                'model': model_id,
                'temperature': 0.7,
                'max_tokens': 1000
            }
            
            # 调用提供商API（这里需要根据实际的提供商管理器接口调整）
            provider_instance = self.provider_manager.get_provider(provider)
            if not provider_instance:
                raise Exception(f"找不到提供商: {provider}")
            
            # 模拟API调用（实际应该调用真实的API）
            response = await self.simulate_model_response(model_id, context)
            return response
            
        except Exception as e:
            logger.error(f"调用模型API失败 {provider}/{model_id}: {e}")
            raise
    
    async def simulate_model_response(self, model_id: str, context: List[dict]) -> str:
        """模拟模型响应（用于测试）"""
        # 获取最后一条用户消息
        user_messages = [msg for msg in context if msg['role'] == 'user']
        if not user_messages:
            return "我没有收到您的消息，请重新发送。"
        
        last_message = user_messages[-1]['content']
        
        # 根据模型ID生成不同的响应
        responses = {
            'gpt-4': f"作为GPT-4，我理解您说的是：{last_message}。让我为您提供详细的分析...",
            'gpt-3.5-turbo': f"GPT-3.5这里！关于「{last_message}」，我的看法是...",
            'claude-3-sonnet': f"Claude在此。您提到的「{last_message}」很有趣，我认为...",
            'deepseek-chat': f"DeepSeek回应：关于「{last_message}」这个话题，从技术角度来看...",
            'qwen-turbo': f"通义千问为您解答：针对「{last_message}」，我的建议是..."
        }
        
        # 添加随机延迟模拟真实API响应时间
        await asyncio.sleep(1 + hash(model_id) % 3)
        
        return responses.get(model_id, f"模型{model_id}回应：{last_message}")
    
    async def send_context_update(self, session_id: str):
        """发送上下文更新"""
        try:
            context_info = await self.context_service.get_context_info(session_id)
            
            await self.connection_manager.send_message(session_id, {
                'type': 'context_update',
                'contextSize': context_info['total_tokens'],
                'messageCount': context_info['message_count']
            })
            
        except Exception as e:
            logger.error(f"发送上下文更新失败: {e}")
    
    async def send_model_status_update(self, session_id: str, model_id: str, status: str):
        """发送模型状态更新"""
        try:
            # 获取模型的上下文使用情况
            model_context = await self.context_service.get_model_context_usage(session_id, model_id)
            
            await self.connection_manager.send_message(session_id, {
                'type': 'model_status',
                'modelId': model_id,
                'status': status,
                'usedContext': model_context.get('used_tokens', 0),
                'maxContext': model_context.get('max_tokens', 0)
            })
            
        except Exception as e:
            logger.error(f"发送模型状态更新失败: {e}")

# 全局处理器实例
group_chat_handler = None

def get_group_chat_handler(provider_manager: ProviderManager) -> GroupChatHandler:
    """获取群聊处理器实例"""
    global group_chat_handler
    if group_chat_handler is None:
        group_chat_handler = GroupChatHandler(provider_manager)
    return group_chat_handler