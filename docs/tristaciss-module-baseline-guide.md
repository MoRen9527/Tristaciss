# Tristaciss 模块启动与代码导读

本文档是 Tristaciss 首轮模块摸底后的新人导读版说明，目标不是替代 `AGENTS.md`、`CLAUDE.md` 或专项技术文档，而是让第一次接手本仓的人能按“模块定位 -> 如何启动 -> 请求怎么走 -> 代码先看哪里 -> 当前坑在哪里”的顺序快速读通。

## 1. 先说结论：Tristaciss 现在是什么

先给一句最短定义：`Tristaciss` 当前是“三元宇宙里的模型 API 平台 + 科幻风格前端交互面”。

把它拆开看，有三层：

1. `api-server/`：FastAPI 后端，负责多 provider 路由、流式聊天、provider 配置管理、模型列表、群聊 WebSocket、登录和用户基础接口。
2. `avatar-react/`：React 18 + Vite 前端，负责登录、主页、聊天、群聊、仪表盘、信息卡片和部分游戏化页面。
3. `docs/` 与根级部署脚本：负责说明如何部署、如何配置、如何排查，以及如何理解前后端链路。

因此，Tristaciss 不是单一后端服务，也不是纯前端壳子，而是一个“前后端一起交付”的模块。

## 2. 仓里有哪些面，哪些算现役

目前最该优先当成现役真源的，是下面这几块：

- `api-server/start_server.py`
- `api-server/fastapi_stream.py`
- `api-server/providers/`
- `avatar-react/src/index.tsx`
- `avatar-react/src/App.tsx`
- `avatar-react/src/services/api.ts`
- `avatar-react/src/store/`
- `docs/registry/`

当前不要直接把下面这些当成等权真源：

- 根级 `README.md`：它能告诉你项目大概是什么，但不足以精确描述当前实现。
- `avatar-react/README.md`：它还保留了旧的 JavaScript / CRA 风格说明，和现役 TypeScript + Vite 口径不完全一致。
- `AGENTS.md` / `CLAUDE.md` 里曾提到的 `temp/digital-avatar-app/`：当前仓根未看到该目录，这属于历史口径，不再是现役结构事实。
- 已删除的 `digital-avatar-react/`：它已确认只是残留构建目录；任何文档或规则若仍引用它，都属于待清理旧口径。

### 2.1 当前深入摸底决策

截至 2026-04-24，这轮 Tristaciss 深挖先固定三条约束：

1. 当前现役前端真源仍是 `avatar-react/`，但后续目标是把它平滑迁移到 `Triavatar`。
2. 当前现役后端真源是 `api-server/`，Tristaciss 长期应收敛为模型 API 平台和 provider 路由后端。
3. `api-server` 现役聊天入口仍是 `POST /api/chat/stream`；代码面虽已新增 Phase C 的 `/v1/chat/completions` scaffold 骨架，并且非流式路径已能返回标准 completion 占位响应，但真实 provider 执行链与流式主链还未完成，因此这轮仍不能把 `/v1` 写成已完成落地。

## 3. 本地如何启动

### 3.1 后端启动

```powershell
cd api-server
.\.venv\Scripts\activate
python start_server.py
```

实际启动脚本会先做几件事：

1. 检查当前是否在虚拟环境里。
2. 检查 `fastapi`、`uvicorn`、`openai`、`fastapi_stream` 能否导入。
3. 最后用 `uvicorn.run("fastapi_stream:app", host="0.0.0.0", port=8008, reload=True)` 启动服务。

也就是说，真正的后端应用入口不是 `start_server.py` 本身，而是它最终拉起的 `fastapi_stream:app`。

### 3.2 前端启动

```powershell
cd avatar-react
npm install
npm run dev
```

前端 `package.json` 已明确使用 Vite：

- `dev` -> `vite`
- `start` -> `vite`
- `build` -> `vite build`
- `test` -> `vitest`

`vite.config.ts` 把开发端口固定在 `3000`，所以默认本地访问地址是：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8008`

## 4. 前端启动后发生什么

如果你想顺着代码从头读，前端建议按这个顺序看：

1. `avatar-react/src/index.tsx`
2. `avatar-react/src/App.tsx`
3. `avatar-react/src/store/index.ts`
4. `avatar-react/src/store/authSlice.ts`
5. `avatar-react/src/services/api.ts`
6. `avatar-react/src/pages/LoginPage.tsx`
7. `avatar-react/src/pages/HomePage.tsx`

### 4.1 浏览器入口

`index.tsx` 做了四件事：

1. 创建 React root。
2. 注入 Redux `Provider`。
3. 注入 MUI `ThemeProvider` 和 `CssBaseline`。
4. 注入 `NotificationProvider`，再渲染 `App`。

这意味着，前端的大多数页面逻辑都默认建立在“全局状态 + 主题 + 通知系统已就绪”的前提上。

### 4.2 路由入口

`App.tsx` 用 `react-router-dom` 维护主路由：

- `/login`
- `/`
- `/chathistory`
- `/chat-only`
- `/dashboard-only`
- `/info-card/:cardType`
- `/gamefi`
- `/sci-fi-demo`

当前路由保护方式很直接：

- 已登录 -> 允许访问主页和历史页
- 未登录 -> 重定向到 `/login`

这套判断依赖 Redux 里的 `auth.isAuthenticated`。

### 4.3 登录链路

登录页 `LoginPage.tsx` 提交表单后，会：

1. `dispatch(login(credentials))`
2. `authSlice.ts` 调用 `authAPI.login(credentials)`
3. `authAPI.login()` 最终发到后端 `POST /api/login`
4. 成功后前端把 `session-cookie-auth` 这种占位 token 写进 `localStorage`
5. 再通过 `isAuthenticated` 驱动页面跳转到 `/`

这里要特别注意一个事实：当前现役代码走的是 `/api/login`，不是一些旧文档里写的 `/api/auth/login`。

### 4.4 前端 API 基址

`avatar-react/src/services/api.ts` 使用的是：

- `process.env.REACT_APP_API_URL || '/api'`

但这个前端实际上是 Vite 项目，不是 Create React App。当前能正常工作，是因为 `vite.config.ts` 手工做了：

```ts
define: {
  'process.env': process.env
}
```

这是一种兼容做法，但也意味着这里存在“项目是 Vite，配置口径却沿用 CRA”的技术债。

## 5. 后端启动后发生什么

后端建议按这个顺序看：

1. `api-server/start_server.py`
2. `api-server/fastapi_stream.py`
3. `api-server/providers/manager.py`
4. `api-server/providers/base.py`
5. `api-server/providers/openrouter.py`
6. `api-server/providers/openai.py`
7. `api-server/providers/glm.py`
8. `api-server/config_manager.py`

### 5.1 FastAPI 应用装配

`fastapi_stream.py` 里会：

1. 创建 `FastAPI` 应用。
2. 初始化全局 `ProviderManager()`。
3. 引入 `config_router`、`exchange_rate_router` 等附加路由。
4. 注册 WebSocket 群聊入口：
   - `/ws/group-chat`
   - `/ws/group-chat/{session_id}`
5. 注册大量 HTTP 接口。

换句话说，`fastapi_stream.py` 是当前后端的主集成面，很多功能都汇聚在这里。

但要注意一个深入摸底结论：当前真正承载聊天主线的是 `/api/chat/stream`，不是标准 OpenAI 兼容 `/v1/chat/completions`。

### 5.2 Provider 管理入口

`providers/manager.py` 是后端路由多 provider 的核心入口之一。

它会：

1. 从 `config_manager` 读保存的 provider 配置。
2. 如果配置文件没有，再尝试从环境变量读默认 provider。
3. 根据 provider 名称创建具体实现，例如 OpenRouter、OpenAI、GLM。
4. 维护 provider 注册表、默认 provider 和模型到 provider 的映射。

所以，如果你要排查“为什么这个模型没有走到预期 provider”，`ProviderManager` 是必须先看的文件。

## 6. 一个典型请求怎么走

### 6.1 登录请求

最短链路是：

`LoginPage.tsx` -> `authSlice.ts` -> `authAPI.login()` -> `POST /api/login` -> 登录成功后 Redux 更新认证状态 -> Router 跳到主页

### 6.2 聊天流式请求

聊天流最短链路是：

`avatar-react/src/services/api.ts` 里的 `chatAPI.sendStreamMessage()`
-> 浏览器 `fetch('/api/chat/stream')`
-> FastAPI `POST /api/chat/stream`
-> provider 选择与配置解析
-> provider 流式返回
-> 前端逐段消费 SSE / 数据块并更新聊天 UI

这条链路当前还有两个关键限制：

1. 路由依据主要是前端直接提交的 `provider + config`，不是统一的后端 tag/router。
2. `handle_single_chat()` 会直接创建临时 provider 实例，因此当前并没有一个收敛良好的“OpenAI 兼容入口 -> tag 路由 -> provider 选择”中台层。

### 6.2.1 现役 `/api/chat/stream` 和 OpenAI 兼容接口到底差在哪

这是这轮深入摸底里必须固定下来的一个判断：当前现役 `/api/chat/stream` 只是“前端专用私有聊天入口”，它还不是对外统一的 OpenAI 兼容平台接口。

最核心的差异有五个：

1. 请求体形状不同。当前 `/api/chat/stream` 主要收 `query`、`provider`、`config`、`chat_mode`、`group_settings`，后端再把 `query` 临时包装成一条 user message；而 OpenAI 兼容接口要求直接接收标准 `messages`，并兼容 `model`、`stream`、`temperature`、`max_tokens`。
2. 路由责任不同。当前链路要求前端把 `provider` 甚至 `api_key/base_url/default_model` 这类 provider 配置带给后端，属于“前端选路，后端代发”；OpenAI 兼容合同要求客户端只描述需求，后端依据 `tag`、`modelTag`、`routeMeta` 做统一策略路由。
3. 返回协议不同。当前 `/api/chat/stream` 返回的是自定义 SSE 事件，常见事件类型只有 `start`、`content`、`end`、`error`；OpenAI 兼容接口则应返回标准 `chat.completion` 或 `responses` 结构，并只在 `tmv` 扩展字段里补充平台路由结果。
4. 认证边界不同。当前现役前端请求还是本地页面和私有 token 口径；OpenAI 兼容合同要求以平台代理 key 作为认证边界，并补 `X-TMV-Client`、`X-TMV-Trace-Id` 这类平台级请求头。
5. 接口定位不同。当前 `/api/chat/stream` 混合了承载单聊和群聊的前端产品语义，而 OpenAI 兼容接口要收敛成后端平台基础面，包括 `/v1/chat/completions`、`/v1/responses` 和 `/v1/models`。

所以，后续整改方向不是简单把 `/api/chat/stream` 改个名字，而是把它背后的职责重构成：

`OpenAI-compatible ingress -> tag/modelTag route layer -> provider binding -> standardized response`

在这一步完成前，文档里都不能把 Tristaciss 写成“已经提供 OpenAI 兼容 API”。

### 6.3 Provider 设置流

Provider 设置相关的主要后端面包括：

- `GET /api/providers`
- `GET /api/providers/openrouter/models`
- `GET /api/providers/settings`
- `POST /api/providers/config`
- `POST /api/providers/test`
- `GET /api/providers/models/status`

这说明 Tristaciss 不只是“模型调用接口”，也承担配置工作台和运行前验证工作流。

### 6.4 群聊流

群聊并不只走普通 HTTP，它还使用 WebSocket：

- `/ws/group-chat`
- `/ws/group-chat/{session_id}`

如果以后要排查“多人 AI/多 provider 群聊为什么没响应”，要同时看：

1. 前端 store 里的群聊事件监听
2. `fastapi_stream.py` 的 WebSocket 入口
3. WebSocket handler 与 provider manager 的衔接

## 7. 新人第一次读代码，建议按什么顺序

如果你是产品同学，建议先看：

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/registry/product-state.md`
4. `docs/React + FastAPI 登录流程完整指南.md`
5. `README_DEPLOYMENT.md` 与部署说明

如果你是前端开发，建议先看：

1. `avatar-react/package.json`
2. `avatar-react/vite.config.ts`
3. `avatar-react/src/index.tsx`
4. `avatar-react/src/App.tsx`
5. `avatar-react/src/store/index.ts`
6. `avatar-react/src/store/authSlice.ts`
7. `avatar-react/src/services/api.ts`

如果你是后端开发，建议先看：

1. `api-server/start_server.py`
2. `api-server/fastapi_stream.py`
3. `api-server/providers/manager.py`
4. `api-server/config_manager.py`
5. `api-server/providers/*.py`
6. `api-server/tests/`
7. 根级和 `api-server/` 下的 `test_*.py`

## 8. 当前最容易踩的坑

这里列的是这次摸底最直接看到的坑：

1. 文档和实现并不完全同步。
2. 后端主入口 `fastapi_stream.py` 已经很大，而且不仅有重复导入，还有重复的 provider 配置/测试端点声明。
3. 当前聊天入口仍是 `/api/chat/stream`，中央合同里的 `/v1/chat/completions` 还没真正落地。
4. 前端虽然已经是 TypeScript + Vite，但 README 和部分配置口径还在沿用旧的 CRA 语义。
5. 配置链过多：前端缓存、前端默认值、localStorage、后端 JSON 配置、兼容接口、`openai_compatible/provider_mode` 双口径同时存在。
6. `cline` 相关前后端实现是一条弱相关历史分支，和 Tristaciss 当前“模型 API 平台”主线并不一致。
7. 测试入口分散在 `api-server/tests/`、根级 `tests/`、根级 `test_*.py` 与 `api-server/test_*.py`，新人很容易不知道该先跑哪一组。

## 9. 最后总结

用一句话收尾：Tristaciss 当前最像一个“能独立跑起来的多 provider AI 平台模块”，它已经具备前后端联动、登录、聊天、provider 配置和部署说明，但文档口径、历史残留目录、环境变量约定和后端主入口复杂度都还需要继续收敛。

如果要接当前这轮深挖，下一份应优先看的文档是：`docs/tristaciss-deep-dive-remediation-plan.md`。

如果你现在要继续往下做，下一步最合理的动作通常只有两个：

1. 如果你要修功能，先确定你改的是前端页面、API 路由，还是 provider 层。
2. 如果你要收文档，先统一 legacy 路径、登录接口说明、Vite 环境变量说明，再继续扩展教程。
