#!/usr/bin/env python3
import ast
import sys

def check_syntax(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 尝试解析整个文件
        ast.parse(content)
        print("✅ 语法检查通过")
        return True
        
    except SyntaxError as e:
        print(f"❌ 语法错误:")
        print(f"   文件: {filename}")
        print(f"   行号: {e.lineno}")
        print(f"   列号: {e.offset}")
        print(f"   错误: {e.msg}")
        if e.text:
            print(f"   代码: {e.text.strip()}")
        
        # 显示错误行附近的代码
        lines = content.split('\n')
        start = max(0, e.lineno - 3)
        end = min(len(lines), e.lineno + 2)
        
        print(f"\n📍 错误位置附近的代码:")
        for i in range(start, end):
            marker = ">>> " if i + 1 == e.lineno else "    "
            print(f"{marker}{i+1:4d}: {lines[i]}")
        
        return False
    
    except Exception as e:
        print(f"❌ 其他错误: {e}")
        return False

if __name__ == "__main__":
    filename = sys.argv[1] if len(sys.argv) > 1 else "fastapi_stream_fixed.py"
    check_syntax(filename)