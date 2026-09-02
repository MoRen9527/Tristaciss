#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import traceback
import multiprocessing
import os
import platform

# GBK 控制台 emoji 崩启修复（CTO 补令第四件 2026-09-02）：ONLOGON 任务无交互
# 控制台，缺省 GBK 代码页打印 emoji 即 UnicodeEncodeError 崩启。强制 stdout/
# stderr UTF-8（Python 3.7+ reconfigure；防御式——stdout 缺失/不可 reconfigure
# 时静默跳过）。包装层双保险见 register-tristaciss-task.ps1（python -X utf8）。
for _stream in (sys.stdout, sys.stderr):
    if _stream is not None and hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

print("正在启动服务器...")

def main():
    try:
        # 检查是否在虚拟环境中
        in_venv = sys.prefix != sys.base_prefix
        if not in_venv:
            print("⚠️ 警告：未在虚拟环境中运行，可能导致模块导入错误")
            print("建议使用以下命令启动服务器：")
            if platform.system() == "Windows":
                print(".\.venv\Scripts\activate && python start_server.py")
            else:
                print("source .venv/bin/activate && python start_server.py")
            return
        else:
            print("✅ 已在虚拟环境中运行")
        
        # 检查导入
        print("1. 检查基础库导入...")
        import fastapi
        import uvicorn
        print("   ✅ FastAPI库导入成功")
        
        # 检查openai模块
        print("2. 检查OpenAI模块...")
        try:
            from openai import AsyncOpenAI
            print("   ✅ OpenAI模块导入成功")
        except ImportError:
            print("   ❌ OpenAI模块导入失败，GLM连接测试可能会失败")
            print("   建议执行：pip install openai")
        
        print("3. 检查fastapi_stream模块...")
        import fastapi_stream
        print("   ✅ fastapi_stream模块导入成功")
        
        print("4. 检查应用实例...")
        app = fastapi_stream.app
        print("   ✅ 应用实例获取成功")
        
        print("5. 启动服务器...")
        # 常驻化生产口径（2026-09-02 CTO 派工令 a 件）：缺省 127.0.0.1 + reload 关。
        # 本地 listener 禁外部入站（通道 spec §三.2 同构）；dev 需要时 env 显式开。
        host = os.environ.get("TRISTACISS_HOST", "127.0.0.1")
        port = int(os.environ.get("TRISTACISS_PORT", "8008"))
        reload_on = os.environ.get("TRISTACISS_RELOAD", "").lower() in ("1", "true", "yes")
        uvicorn.run(
            "fastapi_stream:app",
            host=host,
            port=port,
            reload=reload_on,
            timeout_keep_alive=120,
            log_level="debug"
        )
        
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        print("\n详细错误信息:")
        traceback.print_exc()
        sys.exit(1) 

if __name__ == '__main__':
    multiprocessing.freeze_support()
    main() 