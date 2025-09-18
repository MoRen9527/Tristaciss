# RAG项目

## 环境配置

### 1. 设置API密钥（重要！）

创建环境变量或在系统中设置：

**Windows (PowerShell):**
```powershell
$env:OPENROUTER_API_KEY="your-openrouter-api-key-here"
```

**Linux/Mac:**
```bash
export OPENROUTER_API_KEY="your-openrouter-api-key-here"
```

**或者创建 .env 文件：**
```bash
# 在 api-server/ 目录下创建 .env 文件
echo "OPENROUTER_API_KEY=your-openrouter-api-key-here" > .env
```

### 2. Python环境配置

```bash
# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
source .venv/bin/activate  # Linux/Mac
# 或
# .venv\Scripts\activate  # Windows

# 更新pip
pip install --upgrade pip

# 安装依赖
pip install -r requirements.txt
```

## 运行应用

```bash
python app.py
```
访问 http://localhost:8000/static/chat.html


## 脚本说明

### 文件目录说明

- **step1 **: 基础RAG示例，会话过程采用内存模拟的方式保存。

- **step2 **: 改进版RAG，支持SQLite数据库， 支持会话持久保存。

- **stream_test **: 流式输出的简单demo




## 开发工具

### SQLite工具
推荐使用 Navicat Premium Lite（免费版）  
下载地址：https://www.navicat.com.cn/download/navicat-premium-lite



### Vue3互动教程

https://cn.vuejs.org/tutorial/#step-1

