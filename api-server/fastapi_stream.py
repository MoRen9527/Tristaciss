import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any, AsyncGenerator
import traceback
import os
import tempfile
import subprocess
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from config_api import router as config_router
from exchange_rate_api import router as exchange_rate_router
from exchange_rate_api import router as exchange_rate_router
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import uvicorn
from utils.exchange_rate import get_current_usd_to_cny_rate
from utils.exchange_rate import get_current_usd_to_cny_rate
from token_stats import TokenStatsCollector
from verify_tokens import verify_router, log_api_call
from verify_tokens import verify_router, log_api_call
from verify_tokens import verify_router, log_api_call
from token_verification import token_verifier
from token_stats import TokenStatsCollector
from token_stats import TokenStatsCollector
from token_stats import TokenStatsCollector

# 导入提供商相关模块
from providers import (
    ProviderManager, ProviderConfig, ProviderType, StreamChunk,
    ProviderError, ProviderConnectionError, ProviderAuthenticationError
)

# 导入配置管理器
from config_manager import config_manager
import logging
logger = logging.getLogger(__name__)

# 导入WebSocket处理器
from websocket_handler import get_group_chat_handler

try:
    from config_command_handler import ConfigCommandHandler
    config_command_handler = None  # 将在需要时初始化
except ImportError:
    ConfigCommandHandler = None
    config_command_handler = None
    logger.warning("配置指令处理器导入失败，将使用传统配置管理")
from config import config

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 全局变量
# 创建全局Provider管理器
provider_manager = ProviderManager()

# 初始化配置指令处理器
if ConfigCommandHandler is not None:
    from config_manager import ConfigManager
    config_manager = ConfigManager()
    config_command_handler = ConfigCommandHandler(config_manager, provider_manager)
    logger.info("配置指令处理器初始化成功")
else:
    config_command_handler = None
    logger.warning("配置指令处理器不可用")

# 添加HTTPBearer安全实例
security = HTTPBearer()

# Pydantic 模型定义
class ChatMessage(BaseModel):
    role: str = Field(..., description="消息角色：user, assistant, system")
    content: str = Field(..., description="消息内容")
    timestamp: Optional[float] = Field(default_factory=time.time)

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="对话消息列表")
    provider: str = Field(..., description="AI提供商名称")
    model: Optional[str] = Field(default=None, description="模型名称")
    stream: bool = Field(default=True, description="是否流式响应")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0)

class ProviderConfigRequest(BaseModel):
    provider_type: str = Field(..., description="提供商类型")
    config: Dict[str, Any] = Field(..., description="配置参数")

class UserLogin(BaseModel):
    username: str = Field(..., min_length=1, description="用户名")
    password: str = Field(..., min_length=1, description="密码")

class UserRegister(BaseModel):
    username: str = Field(..., min_length=1, description="用户名")
    password: str = Field(..., min_length=6, description="密码，至少6位")
    email: Optional[str] = Field(default=None, description="邮箱")

# Cline AI编程相关模型
class CodeCompleteRequest(BaseModel):
    code: str = Field(..., description="要补全的代码")
    prompt: Optional[str] = Field(default="", description="补全提示")
    language: str = Field(default="python", description="编程语言")

class CodeExplainRequest(BaseModel):
    code: str = Field(..., description="要解释的代码")
    language: str = Field(default="python", description="编程语言")

class CodeRefactorRequest(BaseModel):
    code: str = Field(..., description="要重构的代码")
    instruction: str = Field(..., description="重构指令")
    language: str = Field(default="python", description="编程语言")

class CodeGenerateRequest(BaseModel):
    prompt: str = Field(..., description="代码生成提示")
    language: str = Field(default="python", description="编程语言")

class CodeGenerateRequest(BaseModel):
    prompt: str = Field(..., description="代码生成提示")
    language: str = Field(default="python", description="编程语言")

# 应用生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动和关闭时的生命周期管理"""
    logger.info("FastAPI应用启动中...")
    
    # 启动时初始化
    try:
        logger.info("提供商管理器初始化完成")
    except Exception as e:
        logger.error(f"提供商管理器初始化失败: {e}")
    
    yield
    
    # 关闭时清理
    logger.info("FastAPI应用关闭中...")
    try:
        logger.info("提供商管理器清理完成")
    except Exception as e:
        logger.error(f"提供商管理器清理失败: {e}")

# 创建FastAPI应用
app = FastAPI(
    title="Digital Avatar API",
    description="星际阿凡达后端API服务",
    version="1.0.0",
    lifespan=lifespan
)

# 包含配置API路由
app.include_router(config_router)

# 包含汇率API路由
app.include_router(exchange_rate_router)

# 包含简化配置API路由


# WebSocket路由
@app.websocket("/ws/group-chat")
async def websocket_group_chat_endpoint(websocket: WebSocket):
    """群聊WebSocket端点"""
    import uuid
    session_id = str(uuid.uuid4())
    handler = get_group_chat_handler(provider_manager)
    await handler.handle_websocket(websocket, session_id)

@app.websocket("/ws/group-chat/{session_id}")
async def websocket_group_chat_endpoint_with_id(websocket: WebSocket, session_id: str):
    """带会话ID的群聊WebSocket端点"""
    handler = get_group_chat_handler(provider_manager)
    await handler.handle_websocket(websocket, session_id)

# 群聊相关API
@app.get("/api/models")
async def get_available_models():
    """获取所有可用的模型列表"""
    try:
        # 获取所有提供商配置
        all_configs = config_manager.get_all_provider_configs()
        
        available_models = []
        online_providers = []
        
        for provider_name, config in all_configs.items():
            if config.get('enabled', False) and config.get('api_key'):
                # 添加在线提供商
                provider_info = {
                    'name': provider_name,
                    'status': 'online',
                    'enabled': True,
                    'models': []
                }
                
                # 获取该提供商的模型列表
                enabled_models = config.get('enabled_models', [])
                if enabled_models:
                    for model_id in enabled_models:
                        model_info = {
                            'id': model_id,
                            'name': model_id,
                            'provider': provider_name,
                            'providerId': provider_name
                        }
                        available_models.append(model_info)
                        provider_info['models'].append(model_info)
                
                online_providers.append(provider_info)
        
        return {
            'success': True,
            'data': {
                'models': available_models,
                'providers': online_providers,
                'total': len(available_models)
            }
        }
        
    except Exception as e:
        logger.error(f"获取模型列表失败: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'data': {
                'models': [],
                'providers': [],
                'total': 0
            }
        }

@app.get("/api/chat/group-settings")
async def get_group_chat_settings():
    """获取群聊设置"""
    try:
        from config_manager import config_manager
        
        # 获取所有可用的提供商和模型
        available_models = []
        
        # 遍历所有提供商配置
        provider_configs = config_manager.get_all_provider_configs()
        
        for provider_name, config in provider_configs.items():
            if config.get('enabled', False) and config.get('api_key'):
                enabled_models = config.get('enabled_models', [])  # 修正字段名
                for model in enabled_models:
                    available_models.append({
                        'id': model,
                        'name': model,
                        'provider': provider_name,
                        'displayName': f"{model} ({provider_name})"
                    })
        
        return {
            'success': True,
            'data': {
                'availableModels': available_models,
                'defaultSystemPrompt': '你是一个有用的AI助手。请根据用户的问题提供准确、有帮助的回答。'
            }
        }
        
    except Exception as e:
        logger.error(f"获取群聊设置失败: {e}")
        return {'success': False, 'error': str(e)}

@app.post("/api/chat/group-settings")
async def save_group_chat_settings(request: dict):
    """保存群聊设置"""
    try:
        # 这里可以保存用户的群聊偏好设置
        # 目前只是简单返回成功
        return {'success': True, 'message': '群聊设置保存成功'}
        
    except Exception as e:
        logger.error(f"保存群聊设置失败: {e}")
        return {'success': False, 'error': str(e)}

# 聊天消息API (简化版本，参考Cline设计)
@app.post("/api/chat/message")
async def chat_message(request: dict):
    """处理聊天消息 - 简化版本"""
    newline = "\n"
    try:
        import time
        start_time = time.time()
        first_token_time = None
        
        # 处理前端发送的消息格式
        message_data = request.get("message", {})
        if isinstance(message_data, dict):
            message = message_data.get("content", "")
            provider = message_data.get("provider") or request.get("provider", "deepseek")
            model = message_data.get("model") or request.get("model", "deepseek-chat")
        else:
            # 兼容旧格式
            message = str(message_data) if message_data else ""
            provider = request.get("provider", "deepseek")
            model = request.get("model", "deepseek-chat")
        
        models = request.get("models", [model])  # 群聊支持多模型
        
        logger.info(f"收到聊天消息: {message[:50] if len(message) > 50 else message}..., provider: {provider}, model: {model}")
        
        # 验证提供商配置
        from config_manager import config_manager
        provider_config = config_manager.get_provider_config(provider)
        
        if not provider_config or not provider_config.get('enabled') or not provider_config.get('api_key'):
            return {"error": f"提供商 {provider} 未配置或未启用"}
        
        # 检查是否使用OpenAI兼容模式
        openai_compatible = provider_config.get('openaiCompatible', False)
        
        # 根据兼容模式选择提供商实例
        if openai_compatible and provider != 'openai':
            # 使用OpenAI兼容模式
            from providers.openai import OpenAIProvider
            from providers.base import ProviderConfig, ProviderType
            
            temp_config = ProviderConfig(
                provider_type=ProviderType.OPENAI,
                api_key=provider_config.get('api_key', ''),
                base_url=provider_config.get('baseUrl', ''),
                default_model=provider_config.get('defaultModel', model)
            )
            provider_instance = OpenAIProvider(temp_config)
        else:
            # 使用官方SDK或已注册的提供商
            from providers.manager import ProviderManager
            provider_manager = ProviderManager()
            
            provider_instance = provider_manager.get_provider(provider)
            if not provider_instance:
                # 如果是官方SDK模式但未实现，返回错误
                if not openai_compatible:
                    return {"error": f"提供商 {provider} 官方SDK模式正在开发中，请启用OpenAI兼容模式"}
                else:
                    return {"error": f"提供商 {provider} 不可用"}
        
        # 发送消息并获取响应
        response_content = ""
        chunk_count = 0
        usage_info = None  # 存储真实的token使用信息
        
        # 计算开始时间用于性能统计
        start_time = time.time()
        
        # 处理群聊模式的多模型
        if len(models) > 1:
            # 群聊模式：处理多个模型
            responses = []
            
            for model_spec in models:
                try:
                    # 解析模型规格 (provider:model 格式)
                    if ':' in model_spec:
                        model_provider, model_name = model_spec.split(':', 1)
                    else:
                        model_provider = provider
                        model_name = model_spec
                    
                    # 获取对应的提供商实例
                    if model_provider != provider:
                        # 如果是不同的提供商，需要获取对应的配置
                        model_provider_config = config_manager.get_provider_config(model_provider)
                        if not model_provider_config or not model_provider_config.get('enabled'):
                            continue
                        
                        # 创建对应的提供商实例
                        if model_provider_config.get('openaiCompatible', False):
                            from providers.openai import OpenAIProvider
                            from providers.base import ProviderConfig, ProviderType
                            
                            temp_config = ProviderConfig(
                                provider_type=ProviderType.OPENAI,
                                api_key=model_provider_config.get('api_key', ''),
                                base_url=model_provider_config.get('baseUrl', ''),
                                default_model=model_name
                            )
                            current_provider = OpenAIProvider(temp_config)
                        else:
                            current_provider = provider_manager.get_provider(model_provider)
                    else:
                        current_provider = provider_instance
                        
                    if not current_provider:
                        continue
                    
                    # 发送消息到当前模型
                    model_response = ""
                    async for chunk in current_provider.chat_completion(
                        messages=[{"role": "user", "content": message}],
                        model=model_name,
                        stream=False
                    ):
                        if hasattr(chunk, 'content'):
                            model_response += chunk.content
                        elif isinstance(chunk, str):
                            model_response += chunk
                    
                    responses.append({
                        "provider": model_provider,
                        "model": model_name,
                        "response": model_response
                    })
                    
                except Exception as e:
                    logger.error(f"模型 {model_spec} 处理失败: {e}")
                    continue
            
            # 群聊模式：返回多个单独的消息
            if responses:
                # 计算总时间
                total_time = time.time() - start_time
                
                # 返回多个消息的数组格式
                group_messages = []
                for resp in responses:
                    provider_name = resp['provider']
                    model_name = resp['model']
                    model_response = resp['response']
                    
                    # 估算token数量
                    input_tokens = len(message) // 2 if any('\u4e00' <= c <= '\u9fff' for c in message) else len(message) // 4
                    input_tokens = max(10, input_tokens)
                    
                    output_tokens = len(model_response) // 2 if any('\u4e00' <= c <= '\u9fff' for c in model_response) else len(model_response) // 4
                    output_tokens = max(1, output_tokens)
                    
                    total_tokens = input_tokens + output_tokens
                    
                    # 简化的费用计算
                    cost_per_1k_input = 0.001
                    cost_per_1k_output = 0.002
                    input_cost = (input_tokens / 1000) * cost_per_1k_input
                    output_cost = (output_tokens / 1000) * cost_per_1k_output
                    # 获取当前汇率
                    usd_to_cny_rate = get_current_usd_to_cny_rate()
                    total_cost_cny = (input_cost + output_cost) * usd_to_cny_rate
                    
                    # 为每个模型创建单独的消息
                    group_messages.append({
                        "response": model_response,
                        "provider": provider_name,
                        "model": f"{provider_name} - {model_name}",
                        "model_display_name": f"{provider_name} - {model_name}",
                        "performance": {
                            "first_token_time": 0,  # 群聊模式下首字延迟统计较复杂
                            "response_time": total_time,
                            "tokens_per_second": output_tokens / total_time if total_time > 0 else 0
                        },
                        "tokens": {
                            "prompt_tokens": input_tokens,
                            "completion_tokens": output_tokens,
                            "total_tokens": total_tokens,
                            "total_cost_cny": total_cost_cny
                        }
                    })
                
                # 返回群聊消息数组
                return {
                    "group_chat": True,
                    "messages": group_messages
                }
            else:
                response_content = "所有模型都无法响应，请检查配置。"
                selected_model = "群聊模式(无可用模型)"
        else:
            # 单聊模式：使用单个模型
            selected_model = model
            
            async for chunk in provider_instance.chat_completion(
                messages=[{"role": "user", "content": message}],
                model=selected_model,
                stream=False
            ):
                if first_token_time is None:
                    first_token_time = time.time() - start_time
                
                if hasattr(chunk, 'content'):
                    response_content += chunk.content
                    chunk_count += 1
                    # 提取token使用信息（通常在最后一个chunk或CompletionResponse中）
                    if hasattr(chunk, 'usage') and chunk.usage:
                        usage_info = chunk.usage
                elif isinstance(chunk, str):
                    response_content += chunk
                    chunk_count += 1
        
        # 计算性能统计
        total_time = time.time() - start_time
        
        # 使用真实token使用信息或估算
        if usage_info:
            # 使用从API响应中获取的真实token使用信息
            input_tokens = usage_info.get('prompt_tokens', 0)
            output_tokens = usage_info.get('completion_tokens', 0)
            total_tokens = usage_info.get('total_tokens', input_tokens + output_tokens)
            cache_tokens = usage_info.get('cache_creation_input_tokens', 0) + usage_info.get('cache_read_input_tokens', 0)
        else:
            # 回退到估算token数量
            input_tokens = len(message) // 2 if any('\u4e00' <= c <= '\u9fff' for c in message) else len(message) // 4
            input_tokens = max(10, input_tokens)
            
            output_tokens = len(response_content) // 2 if any('\u4e00' <= c <= '\u9fff' for c in response_content) else len(response_content) // 4
            output_tokens = max(1, output_tokens)
            
            total_tokens = input_tokens + output_tokens
            cache_tokens = 0
        tokens_per_second = output_tokens / total_time if total_time > 0 else 0
        
        # 动态费用计算（根据不同提供商的计费模式）
        # 获取当前汇率
        usd_to_cny_rate = get_current_usd_to_cny_rate()
        
        # 检查是否有API返回的实际费用信息（如OpenRouter）
        if usage_info and 'cost' in usage_info:
            # 使用API返回的实际费用（通常是美元）
            api_cost_usd = usage_info.get('cost', 0)
            total_cost_cny = api_cost_usd * usd_to_cny_rate
            # 估算输入输出费用分配（通常输出费用是输入的3倍）
            total_cost_usd = api_cost_usd
            input_cost = total_cost_usd * 0.25  # 25%输入费用
            output_cost = total_cost_usd * 0.75  # 75%输出费用
        else:
            # 按提供商计费模式计算
            if provider == 'deepseek':
                # DeepSeek按人民币计费，无需汇率转换
                cost_per_1k_input_cny = 0.0007  # 0.07分/1K tokens
                cost_per_1k_output_cny = 0.0014  # 0.14分/1K tokens
                input_cost = (input_tokens / 1000) * cost_per_1k_input_cny / usd_to_cny_rate  # 转换为美元等价
                output_cost = (output_tokens / 1000) * cost_per_1k_output_cny / usd_to_cny_rate
                total_cost_cny = (input_tokens / 1000) * cost_per_1k_input_cny + (output_tokens / 1000) * cost_per_1k_output_cny
            elif provider == 'glm':
                # GLM按人民币计费
                cost_per_1k_input_cny = 0.005  # 0.5分/1K tokens
                cost_per_1k_output_cny = 0.005  # 0.5分/1K tokens  
                input_cost = (input_tokens / 1000) * cost_per_1k_input_cny / usd_to_cny_rate
                output_cost = (output_tokens / 1000) * cost_per_1k_output_cny / usd_to_cny_rate
                total_cost_cny = (input_tokens / 1000) * cost_per_1k_input_cny + (output_tokens / 1000) * cost_per_1k_output_cny
            else:
                # 其他提供商按美元计费
                cost_per_1k_input = {
                    'openai': 0.005,
                    'anthropic': 0.003,
                    'google': 0.00125,
                    'openrouter': 0.005
                }.get(provider, 0.001)
                
                cost_per_1k_output = {
                    'openai': 0.015,
                    'anthropic': 0.015,
                    'google': 0.005,
                    'openrouter': 0.015
                }.get(provider, 0.002)
                
                input_cost = (input_tokens / 1000) * cost_per_1k_input
                output_cost = (output_tokens / 1000) * cost_per_1k_output
                total_cost_cny = (input_cost + output_cost) * usd_to_cny_rate
        
        return {
            "response": response_content,
            "provider": provider,
            "model": selected_model,
            "performance": {
                "first_token_time": first_token_time or 0,
                "response_time": total_time,
                "tokens_per_second": tokens_per_second
            },
            "tokens": {
                "input": input_tokens,
                "output": output_tokens,
                "cache": cache_tokens,
                "total": total_tokens,
                "prompt_tokens": input_tokens,  # 保持向后兼容
                "completion_tokens": output_tokens,  # 保持向后兼容
                "total_tokens": total_tokens,  # 保持向后兼容
                "input_cost": input_cost,
                "output_cost": output_cost,
                "cache_cost": (cache_tokens / 1000) * (input_cost / input_tokens * 1000 if input_tokens > 0 else 0) * 0.5,  # 缓存通常是输入价格的一半
                "total_cost_cny": total_cost_cny
            }
        }
        
    except Exception as e:
        logger.error(f"聊天消息处理失败: {e}")
        return {"error": f"聊天消息处理失败: {str(e)}"}

@app.get("/api/health")
async def api_health_check():
    """API健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


# CORS中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 添加验证路由
app.include_router(verify_router)

# 连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket
        logger.info(f"WebSocket连接建立，当前连接数: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]
        logger.info(f"WebSocket连接断开，当前连接数: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"发送个人消息失败: {e}")
                self.disconnect(websocket, user_id)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"广播消息失败: {e}")
                disconnected.append(connection)
        
        # 清理断开的连接
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()

# Cline AI编程服务类
class ClineService:
    """Cline AI编程服务封装（模拟版本）"""
    
    def __init__(self):
        self.api_base = "http://localhost:3001"  # Cline服务的默认端口
    
    def complete_code_sync(self, code: str, prompt: str = "", language: str = "python") -> Dict[str, Any]:
        """代码补全（模拟版本）"""
        try:
            # 根据不同的提示生成不同的代码
            completion = ""
            
            if prompt.lower().find('求和') >= 0 or prompt.lower().find('加法') >= 0 or prompt.lower().find('相加') >= 0 or prompt.lower().find('sum') >= 0:
                completion = """
# 计算两个数之和的函数
def add_numbers(a, b):
    \"\"\"
    计算两个数的和
    
    参数:
        a (int/float): 第一个数
        b (int/float): 第二个数
        
    返回:
        int/float: 两个数的和
    \"\"\"
    return a + b

# 测试函数
if __name__ == "__main__":
    num1 = 10
    num2 = 20
    result = add_numbers(num1, num2)
    print(f"{num1} + {num2} = {result}")
"""
            elif prompt.lower().find('排序') >= 0 or prompt.lower().find('sort') >= 0:
                completion = """
# 排序函数
def sort_list(arr, reverse=False):
    \"\"\"
    对列表进行排序
    
    参数:
        arr (list): 要排序的列表
        reverse (bool): 是否降序排序，默认为False（升序）
        
    返回:
        list: 排序后的列表
    \"\"\"
    return sorted(arr, reverse=reverse)

# 测试函数
if __name__ == "__main__":
    numbers = [5, 2, 8, 1, 9, 3]
    print("原始列表:", numbers)
    print("升序排序:", sort_list(numbers))
    print("降序排序:", sort_list(numbers, reverse=True))
"""
            else:
                completion = f"""
# 这是基于您的提示"{prompt}"生成的代码

def fibonacci(n):
    \"\"\"
    计算斐波那契数列的第n个数
    
    参数:
        n (int): 位置索引
        
    返回:
        int: 斐波那契数
    \"\"\"
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# 测试函数
if __name__ == "__main__":
    print("斐波那契数列:")
    for i in range(10):
        print(f"fibonacci({{i}}) = {{fibonacci(i)}}")
"""
            
            # 如果代码不为空，添加一些上下文相关的补全
            if code and len(code) > 10:
                completion = f"# 基于您的代码补全:\n\n{code}\n\n{completion}"
            
            return {
                "success": True,
                "completion": completion,
                "language": language
            }
                
        except Exception as e:
            logger.error(f"代码补全异常: {e}")
            return {
                "success": False,
                "error": f"代码补全异常: {str(e)}"
            }
    
    def explain_code_sync(self, code: str, language: str = "python") -> Dict[str, Any]:
        """代码解释（模拟版本）"""
        try:
            if not code or len(code) < 5:
                return {
                    "success": False,
                    "error": "代码太短，无法解释"
                }
            
            # 简单的代码解释逻辑
            explanation = f"""
## 代码解释

这段{language}代码的主要功能是:

"""
            
            if language == "python":
                if "def " in code:
                    explanation += "- 定义了一个或多个函数\n"
                if "class " in code:
                    explanation += "- 定义了一个或多个类\n"
                if "import " in code:
                    explanation += "- 导入了一些模块或库\n"
                if "for " in code:
                    explanation += "- 包含循环结构\n"
                if "if " in code:
                    explanation += "- 包含条件判断\n"
                if "__main__" in code:
                    explanation += "- 包含主程序入口点\n"
                
                explanation += "\n### 详细解释\n\n"
                
                # 添加一些更详细的解释
                lines = code.split("\n")
                
                for line in lines:
                    line = line.strip()
                    if line.startswith("def "):
                        current_function = line.split("def ")[1].split("(")[0]
                        explanation += f"\n`{current_function}` 函数: "
                        if "return" in "".join(lines):
                            explanation += "这个函数接受参数并返回一个值。\n"
                        else:
                            explanation += "这个函数执行一些操作但不返回值。\n"
                    elif line.startswith("class "):
                        current_class = line.split("class ")[1].split("(")[0].split(":")[0]
                        explanation += f"\n`{current_class}` 类: 这个类定义了一个对象类型。\n"
                    elif line.startswith("if __name__ == \"__main__\":"):
                        explanation += "\n主程序入口点: 这部分代码只在直接运行脚本时执行，而不是在导入时执行。\n"
            
            explanation += "\n### 总结\n\n"
            explanation += f"这段代码是一个{language}程序，" + ("看起来是一个完整的可执行脚本。" if "__main__" in code else "可能是一个模块或库的一部分。")
            
            return {
                "success": True,
                "explanation": explanation,
                "language": language
            }
                
        except Exception as e:
            logger.error(f"代码解释异常: {e}")
            return {
                "success": False,
                "error": f"代码解释异常: {str(e)}"
            }
    
    def refactor_code_sync(self, code: str, instruction: str, language: str = "python") -> Dict[str, Any]:
        """代码重构（模拟版本）"""
        try:
            if not code or len(code) < 5:
                return {
                    "success": False,
                    "error": "代码太短，无法重构"
                }
            
            # 简单的代码重构逻辑
            refactored_code = code
            
            # 根据指令进行不同的重构
            if "添加注释" in instruction or "add comments" in instruction.lower():
                # 添加一些注释
                lines = code.split("\n")
                refactored_code = "# 这是重构后添加了注释的代码\n\n"
                for i, line in enumerate(lines):
                    if line.strip().startswith("def "):
                        func_name = line.strip().split("def ")[1].split("(")[0]
                        refactored_code += f"{line}\n    # {func_name} 函数的实现\n"
                    elif line.strip().startswith("class "):
                        class_name = line.strip().split("class ")[1].split("(")[0].split(":")[0]
                        refactored_code += f"{line}\n    # {class_name} 类的实现\n"
                    elif line.strip().startswith("if ") or line.strip().startswith("for ") or line.strip().startswith("while "):
                        refactored_code += f"{line}\n    # 控制流语句\n"
                    else:
                        refactored_code += f"{line}\n"
            else:
                # 默认重构：添加文档字符串
                refactored_code = "# 重构后的代码\n\n"
                lines = code.split("\n")
                
                for i, line in enumerate(lines):
                    if line.strip().startswith("def "):
                        func_name = line.strip().split("def ")[1].split("(")[0]
                        refactored_code += f"{line}\n    \"\"\"\n    {func_name} 函数的文档字符串\n    \n    参数:\n        根据函数定义添加参数说明\n    \n    返回:\n        描述返回值\n    \"\"\"\n"
                    elif line.strip().startswith("class "):
                        class_name = line.strip().split("class ")[1].split("(")[0].split(":")[0]
                        refactored_code += f"{line}\n    \"\"\"\n    {class_name} 类的文档字符串\n    \n    描述类的用途和行为\n    \"\"\"\n"
                    else:
                        refactored_code += f"{line}\n"
            
            return {
                "success": True,
                "refactored_code": refactored_code,
                "language": language
            }
                
        except Exception as e:
            logger.error(f"代码重构异常: {e}")
            return {
                "success": False,
                "error": f"代码重构异常: {str(e)}"
            }

# 创建Cline服务实例
cline_service = ClineService()

# 身份验证依赖
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """获取当前用户信息"""
    token = credentials.credentials
    # 这里应该实现真正的token验证逻辑
    # 暂时返回模拟用户信息
    return {"user_id": "test_user", "username": "test"}

# API路由
@app.get("/")
async def root():
    """根路径健康检查"""
    return {
        "message": "Digital Avatar API服务运行中",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "providers": await provider_manager.get_provider_status()
    }

@app.post("/api/login")
async def login(user_data: UserLogin):
    """用户登录"""
    try:
        # 这里应该实现真正的用户验证逻辑
        # 暂时返回模拟token
        if user_data.username == "admin" and user_data.password == "admin123":
            token = str(uuid.uuid4())
            return {
                "success": True,
                "token": token,
                "user": {
                    "id": "1",
                    "username": user_data.username,
                    "email": "admin@example.com"
                }
            }
        elif user_data.username == "user1" and user_data.password == "user123":
            token = str(uuid.uuid4())
            return {
                "success": True,
                "token": token,
                "user": {
                    "id": "2",
                    "username": user_data.username,
                    "email": "user1@example.com"
                }
            }
        elif user_data.username == "demo" and user_data.password == "demo123":
            token = str(uuid.uuid4())
            return {
                "success": True,
                "token": token,
                "user": {
                    "id": "3",
                    "username": user_data.username,
                    "email": "demo@example.com"
                }
            }
        else:
            raise HTTPException(status_code=401, detail="用户名或密码错误")
    except HTTPException as e:
        # 显式捕获HTTPException并重新抛出
        raise e
    except Exception as e:
        logger.error(f"登录失败: {e}")
        raise HTTPException(status_code=500, detail="登录服务异常")

@app.post("/api/auth/register")
async def register(user_data: UserRegister):
    """用户注册"""
    try:
        # 这里应该实现真正的用户注册逻辑
        # 暂时返回成功响应
        return {
            "success": True,
            "message": "注册成功",
            "user": {
                "id": str(uuid.uuid4()),
                "username": user_data.username,
                "email": user_data.email
            }
        }
    except Exception as e:
        logger.error(f"注册失败: {e}")
        raise HTTPException(status_code=500, detail="注册服务异常")

@app.get("/api/providers")
async def get_providers():
    """获取所有可用的AI提供商"""
    try:
        # 构建前端需要的格式
        providers_list = []
        
        # 从配置文件获取已配置的providers
        if config_manager:
            saved_configs = config_manager.get_all_provider_configs()
            
            for provider_name, config_data in saved_configs.items():
                if provider_name == 'test_provider':  # 跳过测试配置
                    continue
                
                # 显示所有provider，不管是否启用（这样用户可以看到并配置）
                # if not config_data.get('enabled', False):
                #     continue
                    
                # 测试连接状态
                is_connected = await provider_manager.test_connection(provider_name)
                
                # 构建provider信息
                provider_info = {
                    "name": provider_name,
                    "displayName": {
                        "openrouter": "OpenRouter",
                        "openai": "OpenAI兼容",
                        "deepseek": "DeepSeek直连",
                        "glm": "智谱GLM"
                    }.get(provider_name, provider_name.title()),
                    "status": "online" if is_connected else "offline",
                    "models": config_data.get('enabled_models', [config_data.get('default_model', 'unknown')]),
                    "features": {
                        "openrouter": ["流式响应", "免费模型"],
                        "openai": ["快速响应", "兼容性好"],
                        "deepseek": ["逻辑推理", "代码生成"],
                        "glm": ["中文优化", "流式响应"]
                    }.get(provider_name, ["AI对话"]),
                    "description": {
                        "openrouter": "OpenRouter聚合多种AI模型",
                        "openai": "OpenAI兼容API接口",
                        "deepseek": "DeepSeek自研AI模型",
                        "glm": "智谱AI大语言模型"
                    }.get(provider_name, f"{provider_name} AI服务"),
                    "lastTested": config_data.get('updated_at'),
                    "connected": is_connected,
                    "config": {
                        "enabled": config_data.get('enabled', True),
                        "base_url": config_data.get('base_url', ''),
                        "default_model": config_data.get('default_model', ''),
                        "api_key": config_data.get('api_key', ''),
                        "enabled_models": config_data.get('enabled_models', []),
                        "enabledModels": config_data.get('enabled_models', [])
                    }
                }
                
                providers_list.append(provider_info)
        
        # 如果没有配置的providers，返回默认列表，包含gpt-oss-20b
        if not providers_list:
            providers_list = [
                {
                    "name": "openrouter",
                    "displayName": "OpenRouter",
                    "status": "unknown",
                    "models": ["openai/gpt-oss-20b:free"],
                    "features": ["流式响应", "免费模型"],
                    "description": "OpenRouter聚合多种AI模型",
                    "lastTested": None,
                    "connected": False,
                    "config": {"enabled": False}
                }
            ]
        
        return {
            "success": True,
            "providers": providers_list
        }
    except Exception as e:
        logger.error(f"获取提供商列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取提供商列表失败")
        
@app.get("/api/providers/openrouter/models")
async def get_openrouter_models():
    """获取OpenRouter提供商的所有可用模型"""
    try:
        # 获取OpenRouter提供商
        provider = None
        
        # 从配置文件获取已配置的providers
        if config_manager:
            saved_configs = config_manager.get_all_provider_configs()
            if 'openrouter' in saved_configs:
                # 创建临时provider实例
                from providers.openrouter import OpenRouterProvider
                
                config = ProviderConfig(
                    provider_type=ProviderType.OPENROUTER,
                    api_key=saved_configs['openrouter'].get('api_key', ''),
                    base_url=saved_configs['openrouter'].get('base_url', 'https://openrouter.ai/api/v1'),
                    default_model=saved_configs['openrouter'].get('default_model', '')
                )
                
                provider = OpenRouterProvider(config)
        
        if not provider:
            raise HTTPException(status_code=404, detail="OpenRouter提供商未配置")
        
        # 获取模型列表
        models = await provider.get_supported_models()
        
        # 转换为JSON可序列化格式
        model_list = []
        for model in models:
            model_list.append({
                "id": model.id,
                "name": model.name,
                "provider": model.provider,
                "max_context_length": model.max_context_length,
                "input_price_per_1k": model.input_price_per_1k,
                "output_price_per_1k": model.output_price_per_1k,
                "supports_streaming": model.supports_streaming
            })
            
        return model_list
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取OpenRouter模型列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取OpenRouter模型列表失败: {str(e)}")

@app.get("/api/providers/settings")
async def get_provider_settings():
    """获取Provider配置设置"""
    try:
        # 返回已配置的provider信息
        providers_info = provider_manager.get_provider_info()
        connection_status = await provider_manager.test_all_connections()
        
        # 构建返回格式
        settings = []
        for name, info in providers_info.items():
            settings.append({
                "name": name,
                "status": "online" if connection_status.get(name, False) else "offline",
                "models": info.get("models", []),
                "lastTested": datetime.now().isoformat()
            })
        
        return settings
    except Exception as e:
        logger.error(f"获取Provider设置失败: {e}")
        raise HTTPException(status_code=500, detail="获取Provider设置失败")

@app.post("/api/providers/config")
async def configure_provider(config_request: ProviderConfigRequest):
    """配置AI提供商"""
    try:
        logger.info(f"收到Provider配置请求: {config_request.provider_type}")
        
        # 标准化 provider 类型
        provider_type_map = {
            "openrouter": "openrouter",
            "openai": "openai", 
            "deepseek": "openai",
            "glm": "glm"
        }
        provider_type_str = provider_type_map.get(config_request.provider_type)
        if not provider_type_str:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"不支持的provider类型: {config_request.provider_type}"
                }
            )

        # 组装 ProviderConfig（使用枚举）
        provider_config = ProviderConfig(
            provider_type=ProviderType(provider_type_str),
            **config_request.config
        )

        # 使用前端传入的 provider_type 作为注册名（openrouter/openai/deepseek）
        success = await provider_manager.configure_provider(config_request.provider_type, provider_config)

        if success:
            # 同时保存到配置管理器
            if config_manager:
                config_data = {
                    'api_key': config_request.config.get('api_key', ''),
                    'base_url': config_request.config.get('base_url', ''),
                    'default_model': config_request.config.get('default_model', ''),
                    'enabled': config_request.config.get('enabled', True)
                }
                config_manager.save_provider_config(config_request.provider_type, config_data)
                logger.info(f"Provider配置已保存: {config_request.provider_type}")
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": f"提供商 {config_request.provider_type} 配置成功"
                }
            )
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "提供商配置失败"
                }
            )

    except Exception as e:
        logger.error(f"配置提供商失败: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"配置提供商失败: {str(e)}"
            }
        )

@app.get("/api/providers/models/status")
async def get_models_status():
    """获取所有模型的可用性状态"""
    try:
        models_status = {}
        
        # 定义各provider支持的模型列表
        # 基于Context7验证结果的正确分类：
        # 注意：部分provider既有官方SDK又支持OpenAI兼容API，可以出现在多个分类中
        provider_models = {
            # 官方SDK连接 - 有官方SDK的提供商
            'openai': [
                'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
                'o1-preview', 'o1-mini', 'gpt-4-vision-preview'
            ],
            'anthropic': [
                'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022',
                'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'
            ],
            'google': [
                'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro',
                'gemini-1.5-pro-vision', 'gemini-1.5-flash-8b'
            ],
            'deepseek': ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
            'glm': [
                # GLM-4.5系列
                'glm-4.5', 'glm-4.5-x', 'glm-4.5-air', 'glm-4.5-airx', 'glm-4.5-flash',
                # GLM-Z1系列（推理模型）
                'glm-z1-air', 'glm-z1-airx', 'glm-z1-flashx', 'glm-z1-flash',
                # 其他GLM模型
                'glm-4-plus', 'glm-4-air-250414', 'glm-4-long', 'glm-4-airx',
                'glm-4-flashx-250414', 'glm-4-flash-250414', 'glm-4', 'glm-4-flash', 'glm-3-turbo'
            ],
            'openrouter': [
                'openai/gpt-4o', 'openai/gpt-4-turbo', 'anthropic/claude-3-opus',
                'google/gemini-pro', 'meta-llama/llama-3-70b-instruct', 'openai/gpt-oss-20b:free'
            ],
            
            # OpenAI兼容接口 - 支持OpenAI兼容API的提供商
            'deepseek_compat': ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
            'glm_compat': [
                # GLM-4.5系列
                'glm-4.5', 'glm-4.5-x', 'glm-4.5-air', 'glm-4.5-airx', 'glm-4.5-flash',
                # GLM-Z1系列（推理模型）
                'glm-z1-air', 'glm-z1-airx', 'glm-z1-flashx', 'glm-z1-flash',
                # 其他GLM模型
                'glm-4-plus', 'glm-4-air-250414', 'glm-4-long', 'glm-4-airx',
                'glm-4-flashx-250414', 'glm-4-flash-250414', 'glm-4', 'glm-4-flash', 'glm-3-turbo'
            ],
            'qwen': [
                'qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext',
                'qwen2.5-72b-instruct', 'qwen2.5-32b-instruct', 'qwen2.5-14b-instruct',
                'qwen2.5-7b-instruct', 'qwen2.5-3b-instruct', 'qwen2.5-1.5b-instruct',
                'qwen2.5-0.5b-instruct', 'qwen-vl-plus', 'qwen-vl-max'
            ],
            'moonshot': ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
            'meta': [
                'llama-3.1-405b-instruct', 'llama-3.1-70b-instruct', 'llama-3.1-8b-instruct',
                'llama-3-70b-instruct', 'llama-3-8b-instruct', 'llama-2-70b-chat', 'llama-2-13b-chat'
            ],
            'openrouter_compat': [
                'openai/gpt-4o', 'openai/gpt-4-turbo', 'anthropic/claude-3-opus',
                'google/gemini-pro', 'meta-llama/llama-3-70b-instruct', 'openai/gpt-oss-20b:free'
            ],
            
            # 聚合平台连接 - 模型聚合平台
            'modelscope': [
                'qwen-turbo', 'qwen-plus', 'qwen-max', 'baichuan2-13b-chat',
                'chatglm3-6b', 'internlm-chat-7b', 'yi-34b-chat'
            ],
            'huggingface': [
                'meta-llama/Llama-2-7b-chat-hf', 'meta-llama/Llama-2-13b-chat-hf',
                'microsoft/DialoGPT-medium', 'facebook/blenderbot-400M-distill',
                'mistralai/Mixtral-8x7B-Instruct-v0.1'
            ]
        }
        
        # 从配置文件获取已配置的providers
        if config_manager:
            saved_configs = config_manager.get_all_provider_configs()
            
            for provider_name, config_data in saved_configs.items():
                if provider_name == 'test_provider':
                    continue
                
                # 检查provider是否有API密钥
                has_api_key = bool(config_data.get('api_key', '').strip())
                is_enabled = config_data.get('enabled', False)
                
                # 测试连接状态
                is_connected = False
                if has_api_key and is_enabled:
                    try:
                        is_connected = await provider_manager.test_connection(provider_name)
                    except Exception as e:
                        logger.warning(f"测试{provider_name}连接失败: {e}")
                
                # 获取该provider支持的所有模型
                supported_models = provider_models.get(provider_name, [])
                default_model = config_data.get('default_model', '')
                
                # 如果有默认模型但不在支持列表中，添加到列表
                if default_model and default_model not in supported_models:
                    supported_models.append(default_model)
                
                # 为每个支持的模型创建状态条目
                for model in supported_models:
                    model_key = f"{provider_name}:{model}"
                    models_status[model_key] = {
                        "available": is_connected and has_api_key and is_enabled,
                        "provider": provider_name,
                        "model": model,
                        "status": "online" if (is_connected and has_api_key and is_enabled) else "offline",
                        "reason": "模型可用" if (is_connected and has_api_key and is_enabled) else (
                            "缺少API密钥" if not has_api_key else (
                                "Provider未启用" if not is_enabled else "连接失败"
                            )
                        )
                    }
        
        return {
            "success": True,
            "models": models_status
        }
    except Exception as e:
        logger.error(f"获取模型状态失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "models": {}
        }

@app.post("/api/providers/test")
async def test_provider_connection(request: dict):
    """测试提供商连接"""
    try:
        provider_name = request.get("provider")
        provider_config = request.get("config")
        
        logger.info(f"测试提供商连接: {provider_name}")
        
        if not provider_name:
            return JSONResponse(
                status_code=400,
                content={
                    "connected": False,
                    "error": "缺少provider参数",
                    "provider": "unknown",
                    "timestamp": time.time()
                }
            )
        
        # 如果提供了配置信息，使用临时provider进行测试
        if provider_config:
            logger.info(f"使用临时配置测试连接: {provider_name}, 配置: {provider_config}")
            
            # 根据provider类型创建临时配置
            provider_type_map = {
                "openrouter": ProviderType.OPENROUTER,
                "openai": ProviderType.OPENAI,
                "deepseek": ProviderType.OPENAI,
                "glm": ProviderType.GLM
            }
            
            provider_type = provider_type_map.get(provider_name)
            if not provider_type:
                return JSONResponse(
                    status_code=400,
                    content={
                        "connected": False,
                        "error": f"不支持的provider类型: {provider_name}",
                        "provider": provider_name,
                        "timestamp": time.time()
                    }
                )
            
            # 创建临时provider配置
            temp_config = ProviderConfig(
                provider_type=provider_type,
                api_key=provider_config.get('api_key', ''),
                base_url=provider_config.get('base_url', ''),
                default_model=provider_config.get('default_model', '')
            )
            
            # 检查是否使用OpenAI兼容模式
            openai_compatible = provider_config.get('openai_compatible', False)
            
            # 创建临时provider实例
            if provider_type == ProviderType.OPENROUTER:
                from providers.openrouter import OpenRouterProvider
                temp_provider = OpenRouterProvider(temp_config)
                is_connected = await temp_provider.test_connection()
            elif provider_type == ProviderType.GLM:
                if openai_compatible:
                    # GLM的OpenAI兼容模式
                    from providers.openai import OpenAIProvider
                    temp_provider = OpenAIProvider(temp_config)
                    is_connected = await temp_provider.test_connection()
                else:
                    # GLM官方SDK模式 - 暂时返回开发中状态
                    logger.info(f"GLM官方SDK模式正在开发中: {provider_name}")
                    return JSONResponse(
                        status_code=200,
                        content={
                            "connected": False,
                            "error": "GLM官方SDK模式正在开发中，请使用OpenAI兼容模式",
                            "provider": provider_name,
                            "timestamp": time.time(),
                            "development_mode": True
                        }
                    )
            else:
                # 其他提供商根据兼容模式选择调用方式
                if openai_compatible or provider_type == ProviderType.OPENAI:
                    # 使用OpenAI兼容模式
                    from providers.openai import OpenAIProvider
                    temp_provider = OpenAIProvider(temp_config)
                    is_connected = await temp_provider.test_connection()
                else:
                    # 官方SDK模式 - 暂时返回开发中状态
                    logger.info(f"提供商 {provider_name} 官方SDK模式正在开发中")
                    return JSONResponse(
                        status_code=200,
                        content={
                            "connected": False,
                            "error": f"{provider_name}官方SDK模式正在开发中，请使用OpenAI兼容模式",
                            "provider": provider_name,
                            "timestamp": time.time(),
                            "development_mode": True
                        }
                    )
        else:
            # 如果没有提供配置信息，使用已注册的provider进行测试
            is_connected = await provider_manager.test_connection(provider_name)
        
        logger.info(f"提供商连接测试结果: {provider_name} = {is_connected}")
        
        return JSONResponse(
            status_code=200,
            content={
                "connected": is_connected,
                "provider": provider_name,
                "timestamp": time.time()
            }
        )
        
    except Exception as e:
        logger.error(f"测试提供商连接失败: {e}")
        return JSONResponse(
            status_code=200,  # 返回200而不是500，避免前端显示500错误
            content={
                "connected": False,
                "error": f"测试连接失败: {str(e)}",
                "provider": request.get("provider", "unknown"),
                "timestamp": time.time()
            }
        )

@app.post("/api/chat/group-settings")
async def save_group_chat_settings(request: dict):
    """保存群聊设置"""
    try:
        selected_providers = request.get("selectedProviders", [])
        reply_strategy = request.get("replyStrategy", "discussion")
        
        logger.info(f"保存群聊设置: providers={selected_providers}, strategy={reply_strategy}")
        
        # 这里可以保存到数据库或配置文件
        # 暂时只返回成功响应
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "群聊设置保存成功",
                "settings": {
                    "selectedProviders": selected_providers,
                    "replyStrategy": reply_strategy
                }
            }
        )
        
    except Exception as e:
        logger.error(f"保存群聊设置失败: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"保存群聊设置失败: {str(e)}"
            }
        )

# Cline AI编程相关API端点
@app.post("/api/cline/complete")
async def cline_complete(request: CodeCompleteRequest):
    """代码补全"""
    try:
        if not request.code:
            raise HTTPException(status_code=400, detail="代码内容不能为空")
        
        # 调用Cline服务（同步版本）
        result = cline_service.complete_code_sync(request.code, request.prompt, request.language)
        
        return result
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"代码补全请求失败: {e}")
        raise HTTPException(status_code=500, detail=f"代码补全请求失败: {str(e)}")

@app.post("/api/cline/explain")
async def cline_explain(request: CodeExplainRequest):
    """代码解释"""
    try:
        if not request.code:
            raise HTTPException(status_code=400, detail="代码内容不能为空")
        
        logger.info(f"收到代码解释请求，代码长度: {len(request.code)}")
        
        # 构建解释提示
        prompt = f"""请详细解释以下代码的功能、逻辑和实现方式：

```{request.language or 'python'}
{request.code}
```

请从以下几个方面进行解释：
1. 代码的主要功能
2. 关键逻辑和算法
3. 变量和函数的作用
4. 可能的改进建议
"""
        
        # 获取可用的Provider
        if not provider_manager._providers:
            return {"success": False, "explanation": "没有可用的AI Provider，请先配置Provider"}
        
        # 优先使用deepseek，如果不可用则使用第一个可用的Provider
        provider = None
        provider_name = None
        if 'deepseek' in provider_manager._providers:
            provider_name = 'deepseek'
            provider = provider_manager.get_provider('deepseek')
        else:
            provider_name = list(provider_manager._providers.keys())[0]
            provider = provider_manager.get_provider(provider_name)
        
        if not provider:
            return {"success": False, "explanation": "无法获取AI Provider"}
        
        logger.info(f"使用Provider: {provider_name}")
        
        # 发送请求到AI模型
        try:
            response_generator = provider.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                model=provider.config.default_model,
                stream=False
            )
            
            explanation = ""
            async for chunk in response_generator:
                if hasattr(chunk, 'content'):
                    explanation += chunk.content
                elif isinstance(chunk, str):
                    explanation += chunk
            
            logger.info("代码解释完成")
            return {"success": True, "explanation": explanation}
            
        except Exception as provider_error:
            logger.error(f"Provider调用失败: {str(provider_error)}")
            return {"success": False, "explanation": f"AI模型调用失败: {str(provider_error)}"}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"代码解释请求失败: {e}")
        return {"success": False, "explanation": f"解释失败: {str(e)}"}

@app.post("/api/cline/refactor")
async def cline_refactor(request: CodeRefactorRequest):
    """代码重构"""
    try:
        if not request.code:
            raise HTTPException(status_code=400, detail="代码内容不能为空")
            
        if not request.instruction:
            raise HTTPException(status_code=400, detail="重构指令不能为空")
        
        # 调用Cline服务（同步版本）
        result = cline_service.refactor_code_sync(request.code, request.instruction, request.language)
        
        return result
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"代码重构请求失败: {e}")
        raise HTTPException(status_code=500, detail=f"代码重构请求失败: {str(e)}")

@app.post("/api/cline/generate")
async def cline_generate(request: CodeGenerateRequest):
    """代码生成"""
    try:
        if not request.prompt:
            raise HTTPException(status_code=400, detail="代码生成提示不能为空")
        
        logger.info(f"收到代码生成请求，提示长度: {len(request.prompt)}")
        
        # 构建代码生成提示
        prompt = f"""请根据以下需求生成{request.language}代码：

需求：{request.prompt}

请生成完整、可运行的代码，包含必要的注释和示例用法。
"""
        
        # 获取可用的Provider
        if not provider_manager._providers:
            return {"success": False, "error": "没有可用的AI Provider，请先配置Provider"}
        
        # 优先使用deepseek，如果不可用则使用第一个可用的Provider
        provider = None
        provider_name = None
        if 'deepseek' in provider_manager._providers:
            provider_name = 'deepseek'
            provider = provider_manager.get_provider('deepseek')
        else:
            provider_name = list(provider_manager._providers.keys())[0]
            provider = provider_manager.get_provider(provider_name)
        
        if not provider:
            return {"success": False, "error": "无法获取AI Provider"}
        
        logger.info(f"使用Provider: {provider_name}")
        
        # 发送请求到AI模型
        try:
            response_generator = provider.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                model=provider.config.default_model,
                stream=False
            )
            
            generated_code = ""
            async for chunk in response_generator:
                if hasattr(chunk, 'content'):
                    generated_code += chunk.content
                elif isinstance(chunk, str):
                    generated_code += chunk
            
            logger.info("代码生成完成")
            return {
                "success": True,
                "code": generated_code,
                "language": request.language
            }
            
        except Exception as e:
            logger.error(f"Provider调用失败: {e}")
            return {"success": False, "error": f"AI模型调用失败: {str(e)}"}
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"代码生成请求失败: {e}")
        return {"success": False, "error": f"代码生成请求失败: {str(e)}"}

@app.post("/api/chat/stream")
async def stream_chat_with_config(request: dict):
    """POST方式的流式聊天API，支持单聊和群聊模式"""
    try:
        query = request.get('query', '')
        chat_mode = request.get('chat_mode', 'single')  # 'single' 或 'group'
        provider_name = request.get('provider', 'openrouter')
        provider_config = request.get('config', {})
        group_settings = request.get('group_settings', {})
        
        logger.info(f"收到POST流式请求: query={query}, mode={chat_mode}, provider={provider_name}")
        
        if not query:
            raise HTTPException(status_code=400, detail="缺少query参数")
        
        # 单聊模式
        if chat_mode == 'single':
            if not provider_config:
                raise HTTPException(status_code=400, detail="单聊模式缺少provider配置")
            
            return await handle_single_chat(query, provider_name, provider_config)
        
        # 群聊模式
        elif chat_mode == 'group':
            if not group_settings.get('selectedProviders'):
                raise HTTPException(status_code=400, detail="群聊模式缺少选择的providers")
            
            return await handle_group_chat(query, group_settings)
        
        else:
            raise HTTPException(status_code=400, detail=f"不支持的聊天模式: {chat_mode}")
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"流式响应失败: {e}")
        raise HTTPException(status_code=500, detail=f"流式响应失败: {str(e)}")

async def handle_single_chat(query: str, provider_name: str, provider_config: dict):
    """处理单聊模式"""
    # 构建消息格式
    messages = [{"role": "user", "content": query}]
    
    # 根据provider类型创建临时配置
    provider_type_map = {
        "openrouter": ProviderType.OPENROUTER,
        "openai": ProviderType.OPENAI,
        "deepseek": ProviderType.OPENAI,
        "glm": ProviderType.GLM
    }
    
    provider_type = provider_type_map.get(provider_name)
    if not provider_type:
        raise HTTPException(status_code=400, detail=f"不支持的provider类型: {provider_name}")
    
    # 创建临时provider配置
    temp_config = ProviderConfig(
        provider_type=provider_type,
        api_key=provider_config.get('api_key', ''),
        base_url=provider_config.get('base_url', ''),
        default_model=provider_config.get('default_model', '')
    )
    
    # 创建临时provider实例
    if provider_type == ProviderType.OPENROUTER:
        from providers.openrouter import OpenRouterProvider
        temp_provider = OpenRouterProvider(temp_config)
    elif provider_type == ProviderType.GLM:
        from providers.glm import GLMProvider
        temp_provider = GLMProvider(temp_config)
    else:
        from providers.openai import OpenAIProvider
        temp_provider = OpenAIProvider(temp_config)
    
    # 流式响应生成器
    async def generate():
        import time
        start_time = time.time()
        first_token_time = None
        total_tokens = 0
        content_length = 0
        
        try:
            yield f"data: {json.dumps({'type': 'start'})}\n\n"
            
            # 确保模型名称不包含提供商前缀
            model_name = temp_config.default_model
            if ':' in model_name:
                model_name = model_name.split(':', 1)[1]
            
            logger.info(f"使用模型名称: {model_name}")
            
            async for chunk in temp_provider.chat_completion(
                messages=messages,
                model=model_name,
                stream=True
            ):
                if chunk.content:
                    data = {
                        "type": "content",
                        "content": chunk.content
                    }
                    yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            
            # 计算总耗时和性能数据
            total_time = time.time() - start_time
            tokens_per_second = total_tokens / total_time if total_time > 0 else 0
            
            # 估算输入token数量
            input_text = ' '.join([msg['content'] for msg in messages])
            input_tokens = len(input_text) // 2 if any('\u4e00' <= c <= '\u9fff' for c in input_text) else len(input_text) // 4
            input_tokens = max(10, input_tokens)  # 最少10个token
            
            total_all_tokens = input_tokens + total_tokens
            
            # 费用计算（以DeepSeek为例：输入¥0.0014/1K tokens，输出¥0.0028/1K tokens）
            input_cost = (input_tokens / 1000) * 0.0014
            output_cost = (total_tokens / 1000) * 0.0028
            total_cost_usd = input_cost + output_cost
            # 获取当前汇率
            usd_to_cny_rate = get_current_usd_to_cny_rate()
            total_cost_cny = total_cost_usd * usd_to_cny_rate  # 美元转人民币汇率
            
            
            yield f"data: {json.dumps({'type': 'end'})}\n\n"
            
        except Exception as e:
            logger.error(f"单聊流式生成失败: {e}")
            error_data = {"type": "error", "error": str(e)}
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
            
    return StreamingResponse(generate(), media_type='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
    })

async def handle_group_chat(query: str, group_settings: dict):
    """处理群聊模式"""
    selected_providers = group_settings.get('selectedProviders', [])
    reply_strategy = group_settings.get('replyStrategy', 'discussion')
    system_prompt = group_settings.get('systemPrompt', '')
    
    logger.info(f"群聊模式: providers={selected_providers}, strategy={reply_strategy}, system_prompt={system_prompt[:50]}...")
    
    # 处理OpenRouter多模型支持
    processed_providers = []
    for provider_item in selected_providers:
        # 检查是否是字典格式（新格式）
        if isinstance(provider_item, dict):
            provider_name = provider_item.get('provider')
            model_id = provider_item.get('model_id')
            if provider_name:
                processed_providers.append((provider_name, model_id))
        # 检查是否是字符串格式（旧格式）
        elif isinstance(provider_item, str):
            # 检查是否是OpenRouter特定模型格式 (openrouter:model_id)
            if ':' in provider_item:
                provider_name, model_id = provider_item.split(':', 1)
                processed_providers.append((provider_name, model_id))
            else:
                processed_providers.append((provider_item, None))
    
    logger.info(f"处理后的providers: {processed_providers}")
    
    # 获取所有已配置的provider配置
    all_configs = {}
    if config_manager:
        saved_configs = config_manager.get_all_provider_configs()
        for provider_name, model_id in processed_providers:
            if provider_name in saved_configs:
                # 复制配置，避免修改原始配置
                provider_config = dict(saved_configs[provider_name])
                
                # 如果指定了模型ID，则覆盖默认模型
                if model_id:
                    provider_config['default_model'] = model_id
                    provider_config['model_id'] = model_id  # 添加模型ID信息
                
                # 使用provider_name:model_id作为键，以区分同一provider的不同模型
                config_key = f"{provider_name}:{model_id}" if model_id else provider_name
                all_configs[config_key] = provider_config
    
    if not all_configs:
        raise HTTPException(status_code=400, detail="没有找到已配置的providers")
    
    # 根据策略处理群聊
    if reply_strategy == 'exclusive':
        return await handle_exclusive_mode(query, all_configs, system_prompt)
    elif reply_strategy == 'discussion':
        return await handle_discussion_mode(query, all_configs, system_prompt)
    else:
        raise HTTPException(status_code=400, detail=f"不支持的回复策略: {reply_strategy}")

async def handle_exclusive_mode(query: str, provider_configs: dict, system_prompt: str = ''):
    """独占模式：所有Provider并发，只返回第一个完成的回复"""
    async def generate():
        import time
        start_time = time.time()
        first_token_time = None
        total_tokens = 0
        content_length = 0
        
        try:
            yield f"data: {json.dumps({'type': 'start', 'mode': 'exclusive'})}\n\n"
            
            # 创建所有provider实例
            providers = []
            for provider_name, config_data in provider_configs.items():
                provider_type_map = {
                    "openrouter": ProviderType.OPENROUTER,
                    "openai": ProviderType.OPENAI,
                    "deepseek": ProviderType.OPENAI,
                    "glm": ProviderType.GLM
                }
                
                provider_type = provider_type_map.get(provider_name)
                if not provider_type:
                    continue
                
                temp_config = ProviderConfig(
                    provider_type=provider_type,
                    api_key=config_data.get('api_key', ''),
                    base_url=config_data.get('base_url', ''),
                    default_model=config_data.get('default_model', '')
                )
                
                if provider_type == ProviderType.OPENROUTER:
                    from providers.openrouter import OpenRouterProvider
                    provider = OpenRouterProvider(temp_config)
                    
                    # 如果是OpenRouter且有指定模型ID，设置模型
                    if model_id:
                        provider.set_model(model_id)
                elif provider_type == ProviderType.GLM:
                    from providers.glm import GLMProvider
                    provider = GLMProvider(temp_config)
                else:
                    from providers.openai import OpenAIProvider
                    provider = OpenAIProvider(temp_config)
                
                providers.append((provider_name, provider, temp_config))
            
            # 并发调用所有providers，使用第一个完成的
            messages = [{"role": "user", "content": query}]
            
            async def get_response(provider_name, provider, config):
                try:
                    response_content = ""
                    async for chunk in provider.chat_completion(
                        messages=messages,
                        model=config.default_model,
                        stream=True
                    ):
                        if chunk.content:
                            response_content += chunk.content
                    return provider_name, response_content
                except Exception as e:
                    logger.error(f"Provider {provider_name} 失败: {e}")
                    return provider_name, None
            
            # 创建并发任务
            tasks = [get_response(name, provider, config) for name, provider, config in providers]
            
            # 等待第一个完成的任务
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            
            # 取消其他任务
            for task in pending:
                task.cancel()
            
            # 获取第一个完成的结果
            winner_name, winner_response = None, None
            for task in done:
                try:
                    name, response = await task
                    if response:
                        winner_name, winner_response = name, response
                        break
                except Exception as e:
                    logger.error(f"获取任务结果失败: {e}")
            
            if winner_response:
                # 标记获胜的provider
                yield f"data: {json.dumps({'type': 'winner', 'provider': winner_name})}\n\n"
                
                # 流式输出获胜者的回复
                for char in winner_response:
                    data = {
                        "type": "content",
                        "content": char,
                        "provider": winner_name
                    }
                    yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.01)  # 模拟打字机效果
            else:
                yield f"data: {json.dumps({'type': 'error', 'error': '所有providers都失败了'})}\n\n"
            
            yield f"data: {json.dumps({'type': 'end'})}\n\n"
            
        except Exception as e:
            logger.error(f"独占模式失败: {e}")
            error_data = {"type": "error", "error": str(e)}
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(generate(), media_type='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
    })

async def handle_discussion_mode(query: str, provider_configs: dict, system_prompt: str = ''):
    """讨论模式：依次调用每个Provider，后面的能看到前面的回复"""
    async def generate():
        try:
            yield f"data: {json.dumps({'type': 'start', 'mode': 'discussion'})}\n\n"
            
            # 初始消息
            conversation = [{"role": "user", "content": query}]
            
            # AI名称映射 - 使用模型名称
            ai_names = {
                'openrouter': 'OpenRouter',
                'openai': 'OpenAI', 
                'deepseek': 'DeepSeek',
                'glm': '智谱GLM'
            }
            
            previous_responses = []  # 存储之前的回复用于引用
            
            # 按顺序调用每个provider
            for i, (provider_key, config_data) in enumerate(provider_configs.items()):
                import time
                start_time = time.time()
                import time
                start_time = time.time()
                first_token_time = None
                
                # 解析provider_key，可能是"provider:model_id"格式
                if ':' in provider_key:
                    provider_name, model_id = provider_key.split(':', 1)
                else:
                    provider_name = provider_key
                    model_id = None
                
                # 获取AI名称
                if model_id and provider_name == 'openrouter':
                    # 如果是OpenRouter特定模型，使用模型ID作为名称
                    model_display_name = model_id.split('/')[-1] if '/' in model_id else model_id
                    ai_name = f"OpenRouter-{model_display_name}"
                    display_provider = f"openrouter:{model_id}"
                else:
                    ai_name = ai_names.get(provider_name, provider_name.capitalize())
                    display_provider = provider_name
                
                provider_type_map = {
                    "openrouter": ProviderType.OPENROUTER,
                    "openai": ProviderType.OPENAI,
                    "deepseek": ProviderType.OPENAI,
                    "glm": ProviderType.GLM
                }
                
                provider_type = provider_type_map.get(provider_name)
                if not provider_type:
                    continue
                
                temp_config = ProviderConfig(
                    provider_type=provider_type,
                    api_key=config_data.get('api_key', ''),
                    base_url=config_data.get('base_url', ''),
                    default_model=config_data.get('default_model', '')
                )
                
                if provider_type == ProviderType.OPENROUTER:
                    from providers.openrouter import OpenRouterProvider
                    provider = OpenRouterProvider(temp_config)
                elif provider_type == ProviderType.GLM:
                    from providers.glm import GLMProvider
                    provider = GLMProvider(temp_config)
                else:
                    from providers.openai import OpenAIProvider
                    provider = OpenAIProvider(temp_config)
                
                # 标记当前AI开始思考
                yield f"data: {json.dumps({'type': 'provider_thinking', 'provider': provider_name, 'ai_name': ai_name, 'index': i})}\n\n"
                
                # 模拟思考时间
                await asyncio.sleep(1)
                
                # 标记当前回复的provider
                yield f"data: {json.dumps({'type': 'provider_start', 'provider': provider_name, 'ai_name': ai_name, 'index': i})}\n\n"
                
                try:
                    # 构建包含讨论上下文的提示词
                    discussion_messages = []
                    
                    # 添加系统提示词（如果有）
                    if system_prompt:
                        discussion_messages.append({"role": "system", "content": system_prompt})
                    
                    if i == 0:
                        # 第一个AI，直接回答问题
                        discussion_messages.append({"role": "user", "content": f"请{ai_name}回答以下问题: {query}"})
                    else:
                        # 后续AI，可以看到前面的讨论
                        discussion_context = f"以下是关于问题「{query}」的讨论:\n\n"
                        for j, msg in enumerate(conversation[1:], 1):  # 跳过原始用户问题
                            if msg['role'] == 'assistant':
                                discussion_context += f"{msg['content']}\n\n"
                        
                        discussion_context += f"现在请{ai_name}发表你的观点，你可以参考或回应之前的观点："
                        discussion_messages.append({"role": "user", "content": discussion_context})
                    
                    # 获取当前provider的回复
                    response_content = ""
                    async for chunk in provider.chat_completion(
                        messages=discussion_messages,
                        model=temp_config.default_model,
                        stream=True
                    ):
                        if chunk.content:
                            response_content += chunk.content
                            data = {
                                "type": "content",
                                "content": chunk.content,
                                "provider": provider_name,
                                "ai_name": ai_name,
                                "index": i
                            }
                            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                    
                    # 将这个回复添加到对话历史中
                    if response_content:
                        conversation.append({
                            "role": "assistant", 
                            "content": f"[{ai_name}]: {response_content}"
                        })
                    
                    # 标记当前provider回复完成
                    # 导入修复补丁
                    from group_chat_fix import calculate_performance_and_tokens, format_group_chat_event
                    
                    # 计算性能统计和token信息
                    provider_end_data = calculate_performance_and_tokens(
                        start_time if 'start_time' in locals() else time.time() - 1.0,
                        response_content, 
                        discussion_messages, 
                        provider_name, 
                        ai_name, 
                        temp_config.default_model
                    )
                    provider_end_data['index'] = i
                    yield format_group_chat_event(provider_end_data)
                    
                except Exception as e:
                    logger.error(f"Provider {provider_name} 失败: {e}")
                    error_data = {
                        "type": "provider_error", 
                        "provider": provider_name, 
                        "error": str(e),
                        "index": i
                    }
                    yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
            
            yield f"data: {json.dumps({'type': 'end'})}\n\n"
            
        except Exception as e:
            logger.error(f"讨论模式失败: {e}")
            error_data = {"type": "error", "error": str(e)}
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(generate(), media_type='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
    })

@app.get("/api/stream")
async def stream_response_get(request: Request):
    """GET方式的流式响应API，用于简单查询（向后兼容）"""
    try:
        # 获取查询参数
        query = request.query_params.get('query', '')
        provider = request.query_params.get('provider', 'openrouter')
        
        logger.info(f"收到GET流式请求: query={query}, provider={provider}")
        
        if not query:
            raise HTTPException(status_code=400, detail="缺少query参数")
        
        # 对于GET请求，返回提示信息要求使用POST
        async def generate():
            error_data = {
                "type": "error", 
                "error": "请使用POST /api/chat/stream 并提供完整的provider配置"
            }
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                
        return StreamingResponse(generate(), media_type='text/event-stream', headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': request.headers.get('Origin', '*'),
            'Access-Control-Allow-Credentials': 'true'
        })
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"流式响应失败: {e}")
        raise HTTPException(status_code=500, detail=f"流式响应失败: {str(e)}")

@app.post("/api/stream")
async def stream_chat_post(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """处理POST聊天请求"""
    try:
        provider = await provider_manager.get_provider(request.provider)
        if not provider:
            async def error_generator():
                yield f"data: {json.dumps({'error': '提供商未找到'})}\n\n"
            return StreamingResponse(error_generator(), media_type='text/event-stream')
        
        # 构建聊天参数
        chat_params = {
            "messages": [msg.dict() for msg in request.messages],
            "stream": True
        }
        
        if request.model:
            chat_params["model"] = request.model
        if request.temperature is not None:
            chat_params["temperature"] = request.temperature
        if request.max_tokens is not None:
            chat_params["max_tokens"] = request.max_tokens
        
        async def chat_generator():
            try:
                # 获取流式响应
                async for chunk in provider.stream_chat(**chat_params):
                    if isinstance(chunk, StreamChunk):
                        chunk_data = {
                            "content": chunk.content,
                            "finish_reason": chunk.finish_reason,
                            "timestamp": time.time()
                        }
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"流式响应生成失败: {e}")
                error_data = {"error": f"流式响应失败: {str(e)}"}
                yield f"data: {json.dumps(error_data)}\n\n"
        
        return StreamingResponse(chat_generator(), media_type='text/event-stream')
        
    except Exception as e:
        logger.error(f"流式响应生成失败: {e}")
        async def error_generator():
            error_data = {"error": f"流式响应失败: {str(e)}"}
            yield f"data: {json.dumps(error_data)}\n\n"
        return StreamingResponse(error_generator(), media_type='text/event-stream')

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket连接端点"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # 处理不同类型的WebSocket消息
            if message_data.get("type") == "chat":
                await handle_websocket_chat(websocket, user_id, message_data)
            elif message_data.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": time.time()}))
            else:
                await websocket.send_text(json.dumps({"error": "未知消息类型"}))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info(f"用户 {user_id} 断开WebSocket连接")
    except Exception as e:
        logger.error(f"WebSocket处理异常: {e}")
        manager.disconnect(websocket, user_id)

async def handle_websocket_chat(websocket: WebSocket, user_id: str, message_data: dict):
    """处理WebSocket聊天消息"""
    try:
        # 构建聊天请求
        chat_request = ChatRequest(**message_data.get("data", {}))
        
        # 发送开始响应标识
        await websocket.send_text(json.dumps({
            "type": "chat_start",
            "timestamp": time.time()
        }))
        
        # 流式发送聊天响应
        async for chunk_data in stream_chat_response(chat_request):
            if chunk_data.startswith("data: "):
                chunk_json = chunk_data[6:].strip()
                if chunk_json and chunk_json != "[DONE]":
                    await websocket.send_text(json.dumps({
                        "type": "chat_chunk",
                        "data": json.loads(chunk_json)
                    }))
        
        # 发送结束标识
        await websocket.send_text(json.dumps({
            "type": "chat_end",
            "timestamp": time.time()
        }))
        
    except Exception as e:
        logger.error(f"WebSocket聊天处理失败: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"聊天处理失败: {str(e)}"
        }))

# 异常处理器
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """HTTP异常处理器"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """通用异常处理器"""
    logger.error(f"未处理的异常: {exc}")
    logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "内部服务器错误",
            "timestamp": datetime.now().isoformat()
        }
    )

# 模型配置相关API
@app.get("/api/models/available")
async def get_available_models():
    """获取所有可用模型"""
    try:
        models = config.get_available_models()
        return {"models": models}
    except Exception as e:
        logger.error(f"获取可用模型失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config/command")
async def handle_config_command(command: dict):
    """统一的配置指令处理端点"""
    try:
        # 记录指令
        logger.info(f"收到配置指令: {command.get('type')} [ID: {command.get('requestId')}]")
        
        # 处理指令
        response = await config_command_handler.handle_command(command)
        
        # 记录结果
        if response.get('success'):
            logger.info(f"指令处理成功: {command.get('type')}")
        else:
            logger.error(f"指令处理失败: {response.get('error')}")
        
        return response
        
    except Exception as e:
        logger.error(f"配置指令处理异常: {e}")
        return {
            "success": False,
            "error": f"服务器错误: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "requestId": command.get('requestId', 'unknown')
        }

@app.post("/api/providers/config")
async def update_provider_config(request: ProviderConfigRequest):
    """更新提供商配置（兼容性端点）"""
    try:
        # 使用新的指令处理器
        command = {
            "type": "UPDATE",
            "provider": request.provider_type,
            "config": request.config,
            "timestamp": datetime.now().isoformat(),
            "requestId": f"legacy_{int(datetime.now().timestamp())}"
        }
        
        response = await config_command_handler.handle_command(command)
        
        if response.get('success'):
            return {"success": True, "message": "配置更新成功"}
        else:
            raise HTTPException(status_code=500, detail=response.get('error'))
    except Exception as e:
        logger.error(f"更新提供商配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/providers/config")
async def get_providers_config():
    """获取所有提供商配置"""
    try:
        # 直接从provider_manager获取配置
        providers_data = {}
        for name, provider in provider_manager._providers.items():
            providers_data[name] = {
                "provider_type": provider.config.provider_type.value,
                "base_url": provider.config.base_url,
                "default_model": provider.config.default_model,
                "api_key": provider.config.api_key[:10] + "..." if provider.config.api_key else None,
                "has_api_key": bool(provider.config.api_key),
                "connected": True
            }
        
        return {
            "success": True,
            "providers": providers_data,
            "loaded_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"获取提供商配置失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/providers/test")
async def test_provider_connection(request: dict):
    """测试提供商连接"""
    try:
        provider_name = request.get("provider")
        provider_config = request.get("config", {})
        
        # 这里可以添加实际的连接测试逻辑
        # 暂时返回成功状态
        return {
            "connected": True,
            "message": f"{provider_name} 连接测试成功"
        }
    except Exception as e:
        logger.error(f"测试提供商连接失败: {e}")
        return {
            "connected": False,
            "error": str(e)
        }

@app.get("/api/providers/config")
async def get_provider_configs():
    """获取所有提供商配置"""
    try:
        from config_manager import config_manager
        configs = config_manager.get_all_provider_configs()
        return configs
    except Exception as e:
        logger.error(f"获取提供商配置失败: {e}")
        return {}

@app.post("/api/providers/config")
async def save_provider_configs(request: dict):
    """保存所有提供商配置"""
    try:
        from config_manager import config_manager
        
        # 保存每个提供商的配置
        for provider_name, config in request.items():
            # 转换前端字段名到后端格式
            backend_config = {
                'enabled': config.get('enabled', False),
                'api_key': config.get('apiKey', ''),
                'baseUrl': config.get('baseUrl', ''),
                'defaultModel': config.get('defaultModel', ''),
                'enabledModels': config.get('enabledModels', []),
                'openaiCompatible': config.get('openaiCompatible', False)
            }
            
            success = config_manager.save_provider_config(provider_name, backend_config)
            if not success:
                return {"success": False, "error": f"保存 {provider_name} 配置失败"}
        
        logger.info("所有提供商配置保存成功")
        return {"success": True, "message": "配置保存成功"}
        
    except Exception as e:
        logger.error(f"保存提供商配置失败: {e}")
        return {"success": False, "error": str(e)}

# 启动服务器
if __name__ == "__main__":
    # 从环境变量获取配置
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8008))  # 默认端口改为8008
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    logger.info(f"启动FastAPI服务器: {host}:{port}")
    
    uvicorn.run(
        "fastapi_stream:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info" if not debug else "debug"
    )
