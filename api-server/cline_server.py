#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import json
import logging
import time
import uuid
import os
import tempfile
import subprocess
from datetime import datetime
from typing import Dict, List, Optional, Any

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)

# CORS中间件配置
CORS(app, 
     supports_credentials=True,
     origins=["http://localhost:3000", "http://127.0.0.1:3000"],
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# 模拟用户数据库
USERS = {
    "admin": {"password": "admin123", "id": "1", "email": "admin@example.com"},
    "user1": {"password": "user123", "id": "2", "email": "user1@example.com"},
    "demo": {"password": "demo123", "id": "3", "email": "demo@example.com"}
}

# Cline API配置
CLINE_API_BASE = "http://localhost:3001"  # Cline服务的默认端口

class ClineService:
    """Cline AI编程服务封装（模拟版本）"""
    
    def __init__(self):
        self.api_base = CLINE_API_BASE
    
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
            elif prompt.lower().find('文件') >= 0 or prompt.lower().find('读取') >= 0 or prompt.lower().find('写入') >= 0 or prompt.lower().find('file') >= 0:
                completion = """
# 文件操作函数
def read_file(file_path):
    \"\"\"
    读取文件内容
    
    参数:
        file_path (str): 文件路径
        
    返回:
        str: 文件内容
    \"\"\"
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"读取文件出错: {e}"

def write_file(file_path, content):
    \"\"\"
    写入文件内容
    
    参数:
        file_path (str): 文件路径
        content (str): 要写入的内容
        
    返回:
        bool: 是否写入成功
    \"\"\"
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"写入文件出错: {e}")
        return False

# 测试函数
if __name__ == "__main__":
    test_file = "test.txt"
    write_file(test_file, "Hello, World!")
    content = read_file(test_file)
    print(f"文件内容: {content}")
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
                current_function = None
                current_class = None
                
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
            
            elif "优化" in instruction or "optimize" in instruction.lower():
                # 模拟优化
                refactored_code = "# 这是优化后的代码\n\n" + code
                refactored_code = refactored_code.replace("for i in range", "# 使用更高效的迭代\nfor i in range")
                
            elif "重命名" in instruction or "rename" in instruction.lower():
                # 模拟重命名
                if "变量" in instruction or "variable" in instruction.lower():
                    refactored_code = code.replace("i = ", "index = ")
                    refactored_code = refactored_code.replace("for i ", "for index ")
                elif "函数" in instruction or "function" in instruction.lower():
                    if "def " in code:
                        old_func = code.split("def ")[1].split("(")[0]
                        new_func = f"improved_{old_func}"
                        refactored_code = code.replace(f"def {old_func}", f"def {new_func}")
            
            else:
                # 默认重构：添加文档字符串
                refactored_code = "# 重构后的代码\n\n"
                lines = code.split("\n")
                in_function = False
                in_class = False
                
                for i, line in enumerate(lines):
                    if line.strip().startswith("def "):
                        in_function = True
                        func_name = line.strip().split("def ")[1].split("(")[0]
                        refactored_code += f"{line}\n    \"\"\"\n    {func_name} 函数的文档字符串\n    \n    参数:\n        根据函数定义添加参数说明\n    \n    返回:\n        描述返回值\n    \"\"\"\n"
                    elif line.strip().startswith("class "):
                        in_class = True
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
        
    async def complete_code(self, code: str, prompt: str = "", language: str = "python") -> Dict[str, Any]:
        """代码补全"""
        try:
            # 创建临时文件
            with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{language}', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            # 构建Cline命令
            cmd = [
                'cline',
                'complete',
                '--file', temp_file,
                '--language', language
            ]
            
            if prompt:
                cmd.extend(['--prompt', prompt])
            
            # 执行命令
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # 清理临时文件
            os.unlink(temp_file)
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "completion": result.stdout.strip(),
                    "language": language
                }
            else:
                return {
                    "success": False,
                    "error": result.stderr or "代码补全失败"
                }
                
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "代码补全超时"
            }
        except Exception as e:
            logger.error(f"代码补全异常: {e}")
            return {
                "success": False,
                "error": f"代码补全异常: {str(e)}"
            }
    
    async def explain_code(self, code: str, language: str = "python") -> Dict[str, Any]:
        """代码解释"""
        try:
            # 创建临时文件
            with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{language}', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            # 构建Cline命令
            cmd = [
                'cline',
                'explain',
                '--file', temp_file,
                '--language', language
            ]
            
            # 执行命令
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # 清理临时文件
            os.unlink(temp_file)
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "explanation": result.stdout.strip(),
                    "language": language
                }
            else:
                return {
                    "success": False,
                    "error": result.stderr or "代码解释失败"
                }
                
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "代码解释超时"
            }
        except Exception as e:
            logger.error(f"代码解释异常: {e}")
            return {
                "success": False,
                "error": f"代码解释异常: {str(e)}"
            }
    
    async def refactor_code(self, code: str, instruction: str, language: str = "python") -> Dict[str, Any]:
        """代码重构"""
        try:
            # 创建临时文件
            with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{language}', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            # 构建Cline命令
            cmd = [
                'cline',
                'refactor',
                '--file', temp_file,
                '--instruction', instruction,
                '--language', language
            ]
            
            # 执行命令
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60  # 重构可能需要更长时间
            )
            
            # 清理临时文件
            os.unlink(temp_file)
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "refactored_code": result.stdout.strip(),
                    "language": language
                }
            else:
                return {
                    "success": False,
                    "error": result.stderr or "代码重构失败"
                }
                
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "代码重构超时"
            }
        except Exception as e:
            logger.error(f"代码重构异常: {e}")
            return {
                "success": False,
                "error": f"代码重构异常: {str(e)}"
            }

# 创建Cline服务实例
cline_service = ClineService()

# API路由
@app.route("/")
def root():
    """根路径健康检查"""
    return {
        "message": "Cline AI编程助手API服务运行中",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.route("/api")
def api_root():
    """API根路径健康检查"""
    return {
        "message": "Cline AI编程助手API服务运行中",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.route("/health")
@app.route("/api/health")
def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "cline-ai-assistant"
    }

@app.route("/api/login", methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                "success": False,
                "error": "用户名和密码不能为空"
            }), 400
        
        # 验证用户凭据
        user = USERS.get(username)
        if user and user['password'] == password:
            token = str(uuid.uuid4())
            return jsonify({
                "success": True,
                "token": token,
                "user": {
                    "id": user['id'],
                    "username": username,
                    "email": user['email']
                }
            })
        else:
            return jsonify({
                "success": False,
                "error": "用户名或密码错误"
            }), 401
            
    except Exception as e:
        logger.error(f"登录失败: {e}")
        return jsonify({
            "success": False,
            "error": "登录服务异常"
        }), 500

@app.route("/api/user", methods=['GET'])
def get_current_user():
    """获取当前用户信息"""
    # 简单的token验证（实际应用中应该使用更安全的方式）
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "未授权"}), 401
    
    # 返回模拟用户信息
    return jsonify({
        "user": {
            "id": "1",
            "username": "admin",
            "email": "admin@example.com"
        }
    })

@app.route("/api/logout", methods=['POST'])
def logout():
    """用户登出"""
    return jsonify({
        "success": True,
        "message": "登出成功"
    })

@app.route("/api/providers", methods=['GET'])
def get_providers():
    """获取AI提供商列表（兼容原系统）"""
    return jsonify({
        "success": True,
        "providers": {
            "cline": {
                "name": "Cline AI Assistant",
                "type": "cline",
                "connected": True,
                "description": "AI编程助手"
            }
        }
    })

@app.route("/api/models", methods=['GET'])
def get_models():
    """获取可用模型列表（兼容原系统）"""
    return jsonify({
        "success": True,
        "models": [
            {
                "id": "cline-default",
                "name": "Cline Default Model",
                "provider": "cline"
            }
        ]
    })

@app.route("/api/dashboard/system", methods=['GET'])
def get_system_status():
    """获取系统状态（兼容原系统）"""
    return jsonify({
        "success": True,
        "status": "running",
        "uptime": "running",
        "memory_usage": "normal"
    })

@app.route("/api/dashboard/ai", methods=['GET'])
def get_ai_status():
    """获取AI状态（兼容原系统）"""
    return jsonify({
        "success": True,
        "status": "ready",
        "provider": "cline",
        "model": "cline-default"
    })

@app.route("/api/cline/complete", methods=['POST'])
@app.route("/cline/complete", methods=['POST'])
def cline_complete():
    """代码补全"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        prompt = data.get('prompt', '')
        language = data.get('language', 'python')
        
        if not code:
            return jsonify({
                "success": False,
                "error": "代码内容不能为空"
            }), 400
        
        # 调用Cline服务（同步版本）
        result = cline_service.complete_code_sync(code, prompt, language)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"代码补全请求失败: {e}")
        return jsonify({
            "success": False,
            "error": f"代码补全请求失败: {str(e)}"
        }), 500

@app.route("/api/cline/explain", methods=['POST'])
@app.route("/cline/explain", methods=['POST'])
def cline_explain():
    """代码解释"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        language = data.get('language', 'python')
        
        if not code:
            return jsonify({
                "success": False,
                "error": "代码内容不能为空"
            }), 400
        
        # 调用Cline服务（同步版本）
        result = cline_service.explain_code_sync(code, language)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"代码解释请求失败: {e}")
        return jsonify({
            "success": False,
            "error": f"代码解释请求失败: {str(e)}"
        }), 500

@app.route("/api/cline/refactor", methods=['POST'])
@app.route("/cline/refactor", methods=['POST'])
def cline_refactor():
    """代码重构"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        instruction = data.get('instruction', '')
        language = data.get('language', 'python')
        
        if not code:
            return jsonify({
                "success": False,
                "error": "代码内容不能为空"
            }), 400
            
        if not instruction:
            return jsonify({
                "success": False,
                "error": "重构指令不能为空"
            }), 400
        
        # 调用Cline服务（同步版本）
        result = cline_service.refactor_code_sync(code, instruction, language)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"代码重构请求失败: {e}")
        return jsonify({
            "success": False,
            "error": f"代码重构请求失败: {str(e)}"
        }), 500

# 添加流式API端点，用于处理关键词触发（同时支持带/api前缀和不带前缀的路由）
@app.route("/api/stream", methods=['GET', 'POST', 'OPTIONS'])
@app.route("/stream", methods=['GET', 'POST', 'OPTIONS'])
def stream_response():
    """流式响应API，处理关键词触发"""
    if request.method == 'OPTIONS':
        # 处理预检请求（与credentials兼容）
        response = app.make_default_options_response()
        origin = request.headers.get('Origin', '')
        allowed = {"http://localhost:3000", "http://127.0.0.1:3000"}
        if origin in allowed:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Vary'] = 'Origin'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        else:
            # 保底：不信任来源时返回null，避免与credentials冲突
            response.headers['Access-Control-Allow-Origin'] = 'null'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response
        
    try:
        # 获取查询参数
        query = request.args.get('query', '')
        provider = request.args.get('provider', 'openrouter')
        
        logger.info(f"收到流式请求: query={query}, provider={provider}")
        
        # 检查是否包含关键词"启动ai编程"
        if '启动ai编程' in query.lower():
            def generate():
                # 发送初始消息
                yield f"data: {json.dumps({'type': 'start'})}\n\n"
                time.sleep(0.5)
                
                # 发送AI编程助手的响应
                response_parts = [
                    "我已经启动了AI编程助手。",
                    "您可以在编辑器中编写代码，",
                    "然后使用以下功能：",
                    "\n1. 代码补全 - 根据您的代码提供智能补全",
                    "\n2. 代码解释 - 解释您的代码功能",
                    "\n3. 代码重构 - 根据指令优化您的代码",
                    "\n\n请在编辑器中开始编写代码，或者告诉我您需要什么帮助。"
                ]
                
                for part in response_parts:
                    data = {
                        "type": "content",
                        "content": part
                    }
                    yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                    time.sleep(0.3)
                
                # 发送完成消息
                yield f"data: {json.dumps({'type': 'end'})}\n\n"
                
            resp = Response(generate(), mimetype='text/event-stream')
            # 明确设置CORS与SSE相关头
            origin = request.headers.get('Origin', '')
            allowed = {"http://localhost:3000", "http://127.0.0.1:3000"}
            if origin in allowed:
                resp.headers['Access-Control-Allow-Origin'] = origin
                resp.headers['Vary'] = 'Origin'
                resp.headers['Access-Control-Allow-Credentials'] = 'true'
            resp.headers['Cache-Control'] = 'no-cache'
            resp.headers['Connection'] = 'keep-alive'
            resp.headers['X-Accel-Buffering'] = 'no'
            return resp
        else:
            # 对于其他查询，返回一个简单的响应
            return jsonify({
                "success": False,
                "error": "未识别的查询或不支持的提供商"
            }), 400
            
    except Exception as e:
        logger.error(f"流式响应失败: {e}")
        return jsonify({
            "success": False,
            "error": f"流式响应失败: {str(e)}"
        }), 500

# 异常处理器
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "接口不存在",
        "timestamp": datetime.now().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"内部服务器错误: {error}")
    return jsonify({
        "success": False,
        "error": "内部服务器错误",
        "timestamp": datetime.now().isoformat()
    }), 500

if __name__ == '__main__':
    # 从环境变量获取配置
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8008))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    logger.info(f"启动Cline AI编程助手服务器: {host}:{port}")
    
    app.run(
        host=host,
        port=port,
        debug=debug
    )