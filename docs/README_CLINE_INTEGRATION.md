# Cline AI编程助手集成指南

## 项目概述

本项目将Cline AI编程助手集成到了现有的数字分身应用中，使用户可以通过聊天界面触发AI编程功能。集成后的系统提供了类似VS Code的编程体验，包括代码编辑、文件管理、代码运行和AI辅助编程等功能。

## 架构设计

```
数字分身前端 (React + Material-UI)
    ↓ HTTP/WebSocket
数字分身后端 (FastAPI)
    ↓ HTTP API调用
Cline服务器 (Flask)
    ↓ 命令行调用/模拟实现
Cline CLI工具 (可选)
```

## 功能特点

1. **关键词触发**：
   - 用户在聊天界面输入"启动ai编程"即可触发AI编程卡片

2. **VS Code风格界面**：
   - 文件浏览器：支持创建、切换和删除文件
   - 代码编辑器：基于Monaco Editor（VS Code的核心编辑器）
   - 终端输出：显示代码运行结果和AI反馈

3. **可调整宽度的布局**：
   - 用户可以拖动分隔线调整聊天界面和仪表盘的宽度
   - 提供视觉反馈，使拖动操作更加直观

4. **AI编程辅助**：
   - 代码补全：根据用户提示生成代码
   - 代码解释：分析代码功能和结构
   - 代码重构：根据指令优化代码结构

## 技术实现

### 前端实现 (React + Material-UI)

1. **组件结构**：
   - `AIProgrammingCard.tsx`：主要的AI编程卡片组件
   - `AIProgrammingCard.css`：VS Code风格的样式
   - `ResizableLayout.css`：可调整宽度的布局样式

2. **关键词检测**：
   - 在`dynamicCardSlice.ts`中添加了"启动ai编程"关键词映射
   - 当检测到关键词时，触发AI编程卡片的显示

3. **编辑器集成**：
   - 使用`@monaco-editor/react`包集成Monaco编辑器
   - 支持多种编程语言的语法高亮
   - 实现了文件切换和代码编辑功能

### 后端实现 (FastAPI + Flask)

#### 主后端服务 (FastAPI)
- **文件位置**: `api-server/start_server.py`
- **端口**: 8000
- **功能**: 处理用户认证、聊天流式响应、系统管理等

#### Cline服务器 (Flask)
- **文件位置**: `api-server/cline_server.py`
- **启动脚本**: `api-server/start_cline_server.py`
- **端口**: 8008
- **功能**: 专门处理AI编程相关的API请求

### API接口

#### Cline编程API (端口8008)

1. **健康检查**：
   - `GET /health` - 服务健康状态检查
   - `GET /api/health` - API健康状态检查

2. **代码操作**：
   - `POST /api/cline/complete` - 代码补全
   - `POST /api/cline/explain` - 代码解释
   - `POST /api/cline/refactor` - 代码重构

3. **流式响应**：
   - `GET/POST /api/stream` - 处理关键词触发的流式响应

4. **用户认证**（兼容主系统）：
   - `POST /api/login` - 用户登录
   - `GET /api/user` - 获取用户信息
   - `POST /api/logout` - 用户登出

#### API请求示例

**代码补全**：
```json
POST /api/cline/complete
{
  "code": "def hello_world():\n    print(\"Hello, World!\")",
  "prompt": "添加一个计算两个数之和的函数",
  "language": "python"
}
```

**代码解释**：
```json
POST /api/cline/explain
{
  "code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
  "language": "python"
}
```

**代码重构**：
```json
POST /api/cline/refactor
{
  "code": "def calc(a, b):\n    return a + b",
  "instruction": "添加注释和文档字符串",
  "language": "python"
}
```

## 使用方法

### 1. 环境准备

确保已安装Python虚拟环境和Node.js：

```bash
# Python环境
cd api-server
python -m venv .venv
.\.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Node.js环境
cd digital-avatar-react
npm install
```

### 2. 启动服务

按照项目规范启动服务：

```bash
# 1. 启动主后端服务 (FastAPI)
cd api-server
.\.venv\Scripts\activate
python .\start_server.py

# 2. 启动Cline服务器 (Flask)
cd api-server
.\.venv\Scripts\activate
python .\start_cline_server.py

# 3. 启动前端服务 (React)
cd digital-avatar-react
npm start
```

### 3. 使用AI编程功能

1. 在聊天界面中输入"启动ai编程"
2. 在出现的编程卡片中编写代码
3. 使用文件浏览器创建和管理文件
4. 输入提示并点击"AI补全"按钮获取AI生成的代码
5. 使用"解释代码"和"重构代码"功能

## 服务端口配置

- **主后端服务 (FastAPI)**: http://localhost:8000
- **Cline服务器 (Flask)**: http://localhost:8008
- **前端应用 (React)**: http://localhost:3000

## 实现模式

### 当前实现（模拟模式）
- 使用内置的智能代码生成逻辑
- 根据关键词和代码上下文生成相应的代码补全
- 提供代码解释和重构功能
- 无需安装Cline CLI工具

### 真实Cline集成（可选）
如需使用真实的Cline CLI工具：

```bash
# 安装Cline CLI
pip install cline

# 或者使用npm安装
npm install -g @cline/cli
```

## 故障排除

### 1. 服务启动问题

**问题**: Cline服务器启动失败
```bash
# 解决方案
cd api-server
.\.venv\Scripts\activate
pip install flask flask-cors requests
python .\start_cline_server.py
```

**问题**: 端口冲突
```bash
# 检查端口占用
netstat -ano | findstr :8008
# 修改cline_server.py中的端口配置
```

### 2. API调用问题

**问题**: "Failed to fetch"错误
- 检查Cline服务器是否在端口8008运行
- 检查CORS配置是否正确
- 确认前端API调用地址正确

**问题**: 代码补全不工作
- 当前使用模拟数据，会根据提示关键词生成代码
- 检查请求参数是否完整（code, prompt, language）

### 3. 前端集成问题

**问题**: Monaco编辑器加载失败
```bash
# 重新安装依赖
cd digital-avatar-react
npm install @monaco-editor/react
```

**问题**: 关键词触发不工作
- 检查`dynamicCardSlice.ts`中的关键词映射
- 确认流式API端点正常工作

## 测试验证

使用提供的测试脚本验证API功能：

```bash
# 运行API测试
python test_cline_api.py
```

测试脚本会验证：
- 健康检查端点
- 代码补全API
- 代码解释API

## 后续改进计划

1. **增强AI功能**：
   - 集成更多AI模型
   - 支持更多编程语言
   - 添加代码调试功能

2. **优化用户体验**：
   - 改进代码编辑器功能
   - 添加代码片段管理
   - 增强错误处理和提示

3. **系统集成**：
   - 与主FastAPI系统更深度集成
   - 统一用户认证和会话管理
   - 优化服务间通信
