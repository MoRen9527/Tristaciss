# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个名为"三元星球城市空间站"(Tristaciss)的AI应用生产制造平台，具有数字分身系统和科幻主题UI。项目包含：

1. **前端**: React应用程序，具有科幻主题组件 (`avatar-react/`)
2. **后端**: 基于FastAPI的API服务器，支持多提供商AI服务 (`api-server/`)
3. **遗留版本**: Vue.js演示应用 (`temp/digital-avatar-app/`)，一些样式和设计仍需要参考这里。

## 常用开发命令

### 前端 (React - avatar-react/)
```bash
cd avatar-react

# 开发
npm run dev          # 在端口3000启动开发服务器
npm start           # 替代的开发命令

# 构建
npm run build        # 构建到 /build 目录

# 测试
npm test            # 运行 Vitest 测试
npm run test        # 替代测试命令

# 类型检查
# 无特定类型检查命令 - TypeScript错误在构建时显示
```

### 后端 (FastAPI - api-server/)
```bash
cd api-server
.\.venv\scripts\activate

# 开发
python start_server.py        # 在端口8008启动服务器
python cline_server.py        # 替代的Flask服务器，端口5000,这个基本废弃不用了。

# 测试
python test_api.py           # 测试API端点
python test_glm.py           # 测试GLM提供商
python test_deepseek.py      # 测试DeepSeek提供商

# 配置
python config_api.py         # 运行配置管理API
```

## 架构概述

### 前端架构
- **框架**: React 18 with TypeScript
- **构建工具**: Vite
- **状态管理**: Redux Toolkit
- **UI库**: Material-UI (MUI) with custom sci-fi components
- **核心功能**:
  - 科幻主题组件 (StarField, SciFiButton, SciFiCard, SciFiLoader)
  - 多提供商AI聊天系统
  - 用户认证和设置
  - 实时流式响应
  - 提供商配置管理

### 后端架构
- **框架**: FastAPI with async support
- **提供商系统**: 支持多种AI服务的抽象提供商模式
- **配置**: 基于JSON的提供商配置和API端点
- **核心功能**:
  - 多提供商AI模型支持 (DeepSeek, GLM, OpenRouter等)
  - 流式聊天响应
  - 提供商管理和测试
  - 配置持久化
  - 健康检查端点

### 提供商系统
后端使用提供商抽象模式：
- `providers/base.py`: 基础提供商接口
- `providers/manager.py`: 提供商路由和管理
- `providers/{provider}.py`: 单个提供商实现
- 配置存储在 `providers_config.json`

## 配置系统

### 后端配置
- **提供商配置**: `api-server/providers_config.json` - 包含所有AI提供商的API密钥和设置
- **环境变量**: 支持 API_HOST, API_PORT, DATABASE_URL
- **动态加载**: 提供商可通过配置启用/禁用

### 前端配置
- **API基础URL**: 通过环境变量配置
- **主题**: 科幻主题
- **提供商选择**: 动态提供商和模型选择UI

## 开发工作流

### 添加新的AI提供商
1. 在 `api-server/providers/` 中创建继承自 `BaseProvider` 的提供商类
2. 实现必需方法：`chat_completion()`, `test_connection()` 等
3. 将提供商配置添加到 `providers_config.json`
4. 更新提供商管理器以注册新提供商
5. 在提供商设置组件中添加前端支持

### 测试更改
- 后端：使用单个测试脚本 (`test_*.py`) 测试特定提供商
- 前端：使用 `npm test` 进行组件测试
- 集成：使用 `test_api.py` 测试完整流程

## 重要说明

### 多环境设置
- 前端运行在端口3000
- FastAPI后端运行在端口8008
- Flask替代后端运行在端口5000（已废弃）
- 确保正确配置CORS以支持跨源请求

### 提供商配置
- 始终使用 `/api/providers/test` 端点测试提供商连接
- 使用 `/api/providers/config` 端点管理配置
- 提供商设置持久化在JSON文件中，而不是环境变量中

### TypeScript迁移
- 前端正在积极从JavaScript迁移到TypeScript
- 许多文件同时具有 `.js` 和 `.ts` 版本 (例如 `api-TABLET-*.ts`)
- 优先使用TypeScript版本

### 安全性
- API密钥存储在配置文件中（不提交到代码库）
- 在生产环境中使用环境变量存储敏感数据
- CORS配置为仅允许特定来源