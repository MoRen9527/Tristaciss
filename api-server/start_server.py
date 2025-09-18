#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import traceback
import multiprocessing
import os
import platform

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
        uvicorn.run(
            "fastapi_stream:app", 
            host="0.0.0.0", 
            port=8008, 
            reload=True,
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