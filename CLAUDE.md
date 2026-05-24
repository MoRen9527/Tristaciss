# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个名为"三元星球城市空间站"(Tristaciss)的 AI 应用生产制造平台，具有数字分身系统和科幻主题 UI。项目包含：

1. **前端**: React 应用程序，具有科幻主题组件 (`avatar-react/`)；当前仍在 Tristaciss 仓内，但目标是后续平滑迁移到 `Triavatar`。
2. **后端**: 基于 FastAPI 的 API 服务器，支持多提供商 AI 服务 (`api-server/`)。
3. **历史残留**: `temp/digital-avatar-app/` 当前已不在仓内；`digital-avatar-react/` 也已确认并清理为无用残留，相关旧文档只可作为历史参考，不应当成现役真源。

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
.\.venv\scripts\activate

# 开发
python start_server.py        # 在端口8008启动服务器
python cline_server.py        # 替代的Flask服务器，端口5000，这个基本废弃不用了

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
- **配置**: 基于 JSON 的 provider 元数据配置和 API 端点，敏感密钥通过环境变量注入
- **核心功能**:
  - 多提供商 AI 模型支持 (DeepSeek, GLM, OpenRouter 等)
  - 流式聊天响应
  - 提供商管理和测试
  - 配置持久化
  - 健康检查端点

### 提供商系统

- `providers/base.py`: 基础提供商接口
- `providers/manager.py`: 提供商路由和管理
- `providers/{provider}.py`: 单个提供商实现
- 非敏感 provider 元数据存储在 `provider_configs.json`，API Key 通过环境变量加载

### 当前接口边界

- 当前现役聊天入口是 `POST /api/chat/stream`。
- 代码面已挂载 Phase C 的 `/v1/chat/completions` scaffold 骨架，但它当前还不是可用的 OpenAI 兼容实现。
- `/v1/responses` 仍未落地；中央合同里的 OpenAI 兼容 API 仍处于整改进行中，而不是已完成状态。
- `cline_server.py` 和 `/api/cline/*` 路径属于深挖阶段的待清理对象，不是 Tristaciss 核心主线能力。

## 配置系统

### 后端配置

- **提供商配置**: `api-server/provider_configs.json` - 仅保存 provider 开关、base_url、默认模型和模型白名单
- **环境变量**: 支持 API_HOST, API_PORT, DATABASE_URL，以及 `OPENROUTER_API_KEY`、`DEEPSEEK_API_KEY`、`GLM_API_KEY` 等 provider 密钥
- **动态加载**: 提供商可通过配置启用/禁用

### 前端配置

- **API基础URL**: 通过环境变量配置
- **主题**: 科幻主题
- **提供商选择**: 动态提供商和模型选择 UI

## 开发工作流

### 添加新的 AI 提供商

1. 在 `api-server/providers/` 中创建继承自 `BaseProvider` 的提供商类。
2. 实现必需方法：`chat_completion()`, `test_connection()` 等。
3. 将 provider 元数据添加到 `provider_configs.json`，并通过对应环境变量提供 API Key。
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
- 提供商元数据持久化在 JSON 文件中，API Key 只通过环境变量提供

### TypeScript迁移

- 前端正在积极从 JavaScript 迁移到 TypeScript
- 许多文件同时具有 `.js` 和 `.ts` 版本 (例如 `api-TABLET-*.ts`)
- 优先使用 TypeScript 版本

### 安全性

- API 密钥不存储在配置文件中；本地和生产环境都应通过环境变量提供
- `provider_configs.json` 只保留可提交或可忽略的非敏感元数据
- CORS 配置为仅允许特定来源
