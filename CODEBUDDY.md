# CODEBUDDY.md

此文件为 CodeBuddy Code 在此代码库中工作时提供指导。

## 项目概述

这是一个名为"三元星球城市空间站"(Tristaciss)的 AI 应用生产制造平台，具有数字分身系统和科幻主题 UI。项目包含：

1. **前端**: React 应用程序，具有科幻主题组件 (`avatar-react/`)，后续目标是平滑迁移到 `Triavatar`。
2. **后端**: 基于 FastAPI 的 API 服务器，支持多提供商 AI 服务 (`api-server/`)。
3. **历史残留**: `temp/digital-avatar-app/` 当前已不在仓内；`digital-avatar-react/` 已确认无用并移除，任何仍引用它们的文档都属于旧口径。

## 常用开发命令

### 前端 (React - avatar-react/)

```bash
cd avatar-react

# 开发
npm run dev          # 在端口3000启动开发服务器
npm start            # 替代的开发命令

# 构建
npm run build        # 构建到 /build 目录

# 测试
npm test             # 运行 Vitest 测试
npm run test         # 替代测试命令

# 类型检查
# 无特定类型检查命令 - TypeScript错误在构建时显示
```

### 后端 (FastAPI - api-server/)

```bash
cd api-server
./.venv/Scripts/activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# 开发
python start_server.py        # 在端口8008启动服务器
python cline_server.py        # 替代的Flask服务器，端口5000（已废弃）

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
  - 多提供商 AI 聊天系统
  - 用户认证和设置
  - 实时流式响应
  - 提供商配置管理

### 后端架构

- **框架**: FastAPI with async support
- **提供商系统**: 支持多种 AI 服务的抽象提供商模式
- **配置**: 基于 JSON 的提供商配置和 API 端点
- **核心功能**:
  - 多提供商 AI 模型支持 (DeepSeek, GLM, OpenRouter等)
  - 流式聊天响应
  - 提供商管理和测试
  - 配置持久化
  - 健康检查端点

### 提供商系统

- `providers/base.py`: 基础提供商接口，定义 `BaseModelProvider` 抽象类
- `providers/manager.py`: 提供商路由和管理，通过 `ProviderManager` 类实现
- `providers/{provider}.py`: 单个提供商实现 (OpenAI, OpenRouter, GLM等)
- 配置存储在 `provider_configs.json`

### 当前接口边界

- 当前现役聊天入口是 `POST /api/chat/stream`。
- 代码面已挂载 Phase C 的 `/v1/chat/completions` scaffold 骨架，但它当前还不是可用的 OpenAI 兼容实现。
- `/v1/responses` 仍未落地；OpenAI 兼容合同仍处于整改进行中，不应写成已完成状态。
- `cline_server.py` 和 `/api/cline/*` 路径属于待清理废弃面，不是当前核心主线。

## 配置系统

### 后端配置

- **提供商配置**: `api-server/provider_configs.json` - 包含所有 AI 提供商的 API 密钥和设置
- **环境变量**: 支持 API_HOST, API_PORT, DATABASE_URL
- **动态加载**: 提供商可通过配置启用/禁用

### 前端配置

- **API基础URL**: 通过环境变量配置
- **主题**: 科幻主题，使用自定义 MUI 组件
- **提供商选择**: 动态提供商和模型选择 UI

## 开发工作流

### 添加新的 AI 提供商

1. 在 `api-server/providers/` 中创建继承自 `BaseModelProvider` 的提供商类。
2. 实现必需方法：`chat_completion()`, `test_connection()` 等。
3. 将提供商配置添加到 `provider_configs.json`。
4. 更新提供商管理器以注册新提供商。
5. 在提供商设置组件中添加前端支持。

### 测试更改

- 后端：使用单个测试脚本 (`test_*.py`) 测试特定提供商
- 前端：使用 `npm test` 进行组件测试
- 集成：使用 `test_api.py` 测试完整流程

## 重要说明

### 多环境设置

- 前端运行在端口3000
- FastAPI后端运行在端口8008
- Flask替代后端运行在端口5000（已废弃）
- 确保正确配置 CORS 以支持跨源请求

### 提供商配置

- 始终使用 `/api/providers/test` 端点测试提供商连接
- 使用 `/api/providers/config` 端点管理配置
- 提供商设置持久化在 JSON 文件中，而不是环境变量中

### TypeScript迁移

- 前端正在积极从 JavaScript 迁移到 TypeScript
- 许多文件同时具有 `.js` 和 `.ts` 版本 (例如 `api-TABLET-*.ts`)
- 优先使用 TypeScript 版本

### 安全性

- API 密钥存储在配置文件中（不提交到代码库）
- 在生产环境中使用环境变量存储敏感数据
- CORS 配置为仅允许特定来源

## 关键文件和目录

### 前端结构

- `avatar-react/src/App.tsx`: 主应用路由器，包含身份验证
- `avatar-react/src/components/`: 可重用 UI 组件，包括科幻主题组件
- `avatar-react/src/pages/`: 页面组件 (ChatPage, HomePage 等)
- `avatar-react/src/store/`: Redux 存储配置
- `avatar-react/src/services/`: API 服务层

### 后端结构

- `api-server/start_server.py`: 主服务器启动脚本
- `api-server/fastapi_stream.py`: FastAPI 应用程序，包含流式端点
- `api-server/providers/`: 提供商系统实现
- `api-server/config_manager.py`: 配置管理工具
- `api-server/requirements.txt`: Python 依赖项

### 配置文件

- `api-server/provider_configs.json`: 提供商配置和 API 密钥
- `avatar-react/package.json`: 前端依赖项和脚本
- `avatar-react/vite.config.ts`: Vite 构建配置
- `avatar-react/tsconfig.json`: TypeScript 配置

## 测试策略

### 后端测试

- 单个提供商测试: `test_glm.py`, `test_deepseek.py` 等
- API 集成测试: `test_api.py`
- 配置测试: 各种配置验证脚本

### 前端测试

- 使用 Vitest 进行组件测试
- 聊天流程集成测试
- 提供商配置 UI 测试

## 开发环境设置

1. **后端设置**:

   ```bash
   cd api-server
   python -m venv .venv
   .venv/Scripts/activate  # Windows
   pip install -r requirements.txt
   ```

2. **前端设置**:

   ```bash
   cd avatar-react
   npm install
   ```

3. **配置**:
   - 复制提供商配置模板
   - 为所需提供商添加API密钥
   - 开发前测试连接
