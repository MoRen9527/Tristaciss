# Tristaciss 深入摸底与整改草案

本文档记录本轮 Tristaciss 深入摸底的明确结论，重点回答四件事：

1. 哪些目录或实现已经可以判定为历史残留。
2. 当前前后端真实边界是什么，后续如何拆分到 `Triavatar`。
3. `api-server` 从上层调用到 provider 落地的现有实现链路是什么。
4. 哪些架构设计合理，哪些已经明显不合理，以及下一步的整改顺序。

## 1. 已确认的结论

### 1.1 `digital-avatar-react/` 已判定为无用残留

- 目录里只剩 `build/` 和 `node_modules/`。
- 未发现任何现役源码、启动脚本或运行时入口依赖它。
- 本轮已将该目录删除。

因此，任何仍引用 `digital-avatar-react/` 的说明、规则或脚手架都应视为待清理旧口径。

### 1.2 当前前后端真源边界

- `avatar-react/` 是当前现役前端真源。
- `api-server/` 是当前现役后端真源。
- `Tristaciss` 当前仍是“前后端一起交付”的仓，但这只是过渡状态。

后续目标应明确为：

1. `avatar-react/` 平滑迁移到 `Triavatar`。
2. `Tristaciss` 收敛为后端模型 API 平台与 provider 路由仓。
3. 前后端拆分完成后，再做本地 `Triavatar` 和 `Tristaciss` 联调测试。

### 1.3 当前 API 入口事实

- 当前现役聊天入口是 `POST /api/chat/stream`。
- `fastapi_stream.py` 已挂载 Phase C 的 `/v1/chat/completions` scaffold 骨架；当前非流式路径已能返回标准 completion 占位响应，用于验证 route resolution 和响应结构，但真实 provider 执行链与流式主链仍未完成，不能写成可用的 OpenAI 兼容实现。
- `/v1/responses` 仍未落地；中央合同里的 OpenAI 兼容 API 仍整体处于整改进行中，而不是已完成状态。

### 1.4 整改前提：不能把现役接口简单重命名成 OpenAI 兼容接口

这轮整改必须先固定一个前提：`/api/chat/stream` 和目标态 `/v1/chat/completions` / `/v1/responses` 的差异，不是“接口名不同”，而是“接口职责和协议层级不同”。

至少有五个结构性差异：

1. 请求体不同。现役接口收的是 `query`、`provider`、`config`、`chat_mode`、`group_settings`，而 OpenAI 兼容入口应以 `messages`、`model`、`stream`、`temperature`、`max_tokens` 为标准字段。
2. 路由责任不同。现役接口要求前端直接选择 provider 并下传 provider 配置；目标态则要求上层只描述需求，由后端根据 `tag`、`modelTag`、`routeMeta` 统一做 route resolution。
3. 返回协议不同。现役接口返回的是自定义 SSE 事件流，主要事件类型是 `start`、`content`、`end`、`error`；目标态则要返回 OpenAI 标准 completion/responses 结构，只在扩展字段里补平台路由元数据。
4. 认证边界不同。现役接口仍偏向页面内私有调用口径；目标态要切到平台代理 key 和平台级 trace 头部的边界。
5. 接口定位不同。现役 `/api/chat/stream` 混合了承载单聊、群聊和当前前端产品语义，而目标态 `/v1/*` 是面向多客户端和第三方 SDK 的统一模型平台入口。

因此，后续 Phase C 的目标不是把 `/api/chat/stream` 改名为 `/v1/chat/completions`，而是重建一层真正的 OpenAI-compatible ingress：

`OpenAI-compatible ingress -> tag/modelTag route layer -> provider binding -> standardized response`

在这层完成之前，任何“仅改路径名或参数名”的做法都只能算兼容包装，不能算主线整改完成。

## 2. 当前请求链路是怎么走的

## 2.1 上层调用入口

当前前端聊天主链是：

1. `avatar-react/src/services/api.ts`
2. `chatAPI.sendStreamMessage()`
3. 浏览器 `fetch('/api/chat/stream')`

前端当前提交给后端的核心字段是：

- `query`
- `provider`
- `config`

这说明现在的主链不是“标准 OpenAI 请求体”，而是“自定义聊天请求 + provider 配置直传”。

## 2.2 后端入口

`api-server/fastapi_stream.py` 中的 `stream_chat_with_config()` 会：

1. 读取 `query`
2. 判断 `chat_mode` 是 `single` 还是 `group`
3. 在单聊模式下进入 `handle_single_chat()`
4. 在群聊模式下进入 `handle_group_chat()`

### 2.3 单聊模式

`handle_single_chat()` 当前的核心逻辑是：

1. 根据 `provider_name` 选择 `ProviderType`
2. 从前端传入的 `provider_config` 构建临时 `ProviderConfig`
3. 直接实例化 provider
4. 调用 `chat_completion()`
5. 将结果包装成 SSE 文本流返回

这里最关键的一点是：当前它是“按 provider 名称直接实例化临时 provider”，而不是“先进入稳定路由层，再由后端统一决策 provider 和 model”。

## 2.4 Provider 落地

当前 provider 实现主要分三类：

- `providers/openai.py`
- `providers/openrouter.py`
- `providers/glm.py`

其中 `providers/openai.py` 的做法是：

- 使用 `AsyncOpenAI`
- 允许自定义 `base_url`

这意味着：

1. OpenAI 官方 API 可以走它。
2. DeepSeek、兼容 OpenAI 协议的其他 provider 也可以复用它。

这是当前架构里最值得保留的一点，因为它与“上层统一走 OpenAI SDK / OpenAI 兼容接口”的目标是一致的。

## 3. 当前架构里合理的部分

### 3.1 使用 OpenAI SDK + 自定义 `base_url`

这是当前架构里最合理的选择之一。

原因很简单：

1. 上层接口统一。
2. provider 适配成本低。
3. 可以把 DeepSeek、OpenRouter、GLM 等 OpenAI 兼容面统一纳入同一调用抽象。

这与本轮确定的大原则一致：

- 上层统一以通用 OpenAI SDK / OpenAI 兼容接口承载调用。
- 后端根据 tag、modelTag、策略再路由到具体 provider 和具体模型。

### 3.2 `providers/` 抽象层本身是有价值的

尽管当前路由做得不够收敛，但 `providers/base.py`、`providers/manager.py`、`providers/{provider}.py` 这套分层仍然是对的。

应该整改的是“路由和配置方式”，不是把 provider 抽象整个推翻。

### 3.3 前后端拆分方向是正确的

当前 `avatar-react/` 和 `api-server/` 在功能上已经具备较清晰边界。

因此，把前端迁到 `Triavatar`、把 Tristaciss 收敛成后端平台，这个方向是自然演进，不是强行拆分。

## 4. 当前明显不合理的部分

## 4.1 后端入口单体过大

`fastapi_stream.py` 当前已经承载：

- 登录
- 群聊
- provider 配置
- provider 测试
- Cline 编程接口
- 聊天流式接口
- 多组兼容性路由

而且文件里已经出现：

- 重复导入
- 重复的 `/api/providers/config`
- 重复的 `/api/providers/test`
- 重复的 `/api/providers/config` 读取/保存逻辑

这说明问题不是“代码有点乱”，而是“现役主入口已经失去边界”。

## 4.2 当前主链不是 OpenAI 兼容 API，而是自定义请求协议

当前聊天主链依赖：

- `/api/chat/stream`
- `query`
- `provider`
- `config`

这会带来三个直接问题：

1. 前端知道太多 provider 细节。
2. 后端无法稳定沉淀统一路由策略。
3. 很难让其他前端或第三方客户端直接接入 Tristaciss。

这与长期目标是冲突的。

目标态应该是：

- 上层统一 `POST /v1/chat/completions`
- 使用 OpenAI 标准 `messages`
- 扩展字段只保留 `tag`、`modelTag`、`routeMeta` 等少量路由增强信息

## 4.3 路由策略当前混在前端和后端细节里

当前并没有一个清晰的：

- 路由策略层
- tag 到 provider/model 的映射层
- 成本与能力策略层

现状更像：

- 前端先挑 provider
- 前端把配置直接传下去
- 后端按 provider 名称分支创建临时实例

这使得“成本优先”“长上下文优先”“视觉模型优先”“免费模型优先”这类策略很难在后端真正集中治理。

## 4.4 配置层已经超过四层，而且字段口径不统一

当前至少同时存在这些配置层：

1. 后端 `provider_configs.json`
2. 后端 `config_manager.py`
3. 后端 `config_command_handler` / 兼容配置接口
4. 前端 `ConfigManager.ts`
5. 前端 `ProviderSettings.tsx` 默认值
6. 前端 `localStorage` 回退
7. `OpenRouterConfig.tsx` 的 provider mode 特化配置

同时还存在多套字段命名：

- `openai_compatible`
- `openaiCompatible`
- `provider_mode`
- `provider_type`
- `base_url`
- `baseUrl`
- `default_model`
- `defaultModel`

这不只是“代码风格不统一”，而是已经构成结构性配置漂移风险。

### 4.4.1 已见到的明确错误

`fastapi_stream.py` 底部兼容保存接口会把：

- `baseUrl`
- `defaultModel`
- `openaiCompatible`

这种前端字段名直接传给 `config_manager.save_provider_config()`。

而后端保存器期待的是：

- `base_url`
- `default_model`
- `openai_compatible`

这意味着当前保存链本身就存在配置字段丢失或落偏的风险。

### 4.4.2 运行时加载边界已收敛（2026-04-25）

为降低配置漂移和误告警，本轮已把 `ProviderManager` 的运行时加载边界收敛为：

1. 配置层可以继续保留 `enabled=false` 的占位 provider（用于后续启用和设置页展示）。
2. 运行时 registry 只注册 `enabled=true` 且当前后端已有实现映射的 provider。
3. 对 `enabled=true` 但当前后端尚未实现的 provider，保留明确告警并跳过注册。

这次收敛后，`provider_configs.json` 里的未启用占位项不会再在服务启动时触发“未知 provider 类型”噪声告警，也不会污染 Phase C route resolution 的默认运行时 provider 视图。

## 4.5 `cline` 相关实现属于弱相关历史分支

当前 `cline` 相关面包括：

- `api-server/cline_server.py`
- `fastapi_stream.py` 中的 `/api/cline/*`
- `avatar-react/src/components/dashboard/AIProgrammingCard.tsx`
- `avatar-react/src/components/CodeEditor.tsx`
- `docs/README_CLINE_INTEGRATION.md`

它们的问题不是“功能一定错误”，而是“与 Tristaciss 当前主线不一致”。

当前主线是：

- 模型 API 平台
- provider 路由
- OpenAI 兼容接口承载
- 前后端拆分

而 `cline` 这条线更像一个历史阶段的“在数字分身界面里塞编程助手”的附属实验，优先级明显低于主线架构整改。

## 4.6 OpenRouter 双模式设计过重

当前仓内存在：

- `openai_compatible`
- `provider_mode`
- `openrouter_official`
- `OpenRouterConfig.tsx`
- 一整套 dual mode 文档

如果长期战略确定为“上层统一 OpenAI SDK / OpenAI 兼容接口”，那么这套“双模式”设计就显得过重。

保留官方 SDK 作为特殊能力扩展不是不可以，但它不应该继续主导主线架构。

## 5. 目标架构建议

## 5.1 上层统一 OpenAI 兼容入口

建议未来统一暴露：

- `POST /v1/chat/completions`
- `POST /v1/responses`
- `GET /v1/models`

请求主体以 OpenAI 标准字段为主，只保留少量 Tristaciss 扩展字段，例如：

- `tag`
- `modelTag`
- `routeMeta`
- `policy`
- `userMeta`

这样做的价值是：

1. 上层调用更标准。
2. 未来 `Triavatar`、Open WebUI、LobeChat 或其他客户端都更容易接入。
3. 后端可以真正把路由逻辑集中起来。

## 5.2 后端统一 tag 路由层

建议把当前“前端选 provider + 直传 config”的方式，改造成：

1. 上层传 `tag` 和可选 `modelTag`
2. 后端路由层根据策略解析出候选 provider/model
3. 后端再做成本、能力、可用性、延迟的综合选择
4. 最终再交给 provider adapter 执行

例如：

- `tag = avatar.chat`
- `modelTag = cheap`

后端可以解析成：

- 首选 `openrouter:openai/gpt-oss-20b:free`
- 次选 `deepseek:deepseek-chat`
- 兜底 `openai:gpt-4o-mini`

这才符合“通过携带 tag 向后路由到具体 provider 和模型，以发挥模型和成本优势”的原则。

## 5.3 配置系统收敛到一个后端真源

建议把配置系统收敛成：

1. 一个后端真源存储
2. 一个统一的 provider registry 数据结构
3. 一个统一的 route profile/tag mapping 数据结构
4. 前端只做查看、编辑和测试，不再保存独立真源

前端应去掉：

- 大量内置默认模型表
- 多套 localStorage 回退逻辑
- 过多的 provider 特化配置语义

前端只负责：

- 展示后端给出的配置
- 提交修改命令
- 展示测试结果

## 5.4 分仓方向

建议的中期边界：

- `Tristaciss`：后端 API 平台、provider 路由、配置管理、OpenAI 兼容入口
- `Triavatar`：前端 UI、聊天体验、账号入口、页面编排

拆分后，本地联调基线至少应验证：

1. 登录与会话
2. `/v1/chat/completions` 流式响应
3. provider route tag 生效
4. 群聊或多模型功能的接口兼容性

## 6. 建议的整改顺序

## Phase A：先清理真相源与显性残留

1. 删除已判定无用的 `digital-avatar-react/`
2. 修正 `AGENTS.md`、`CLAUDE.md`、registry、模块导读与工具规则中的旧路径引用
3. 把 `cline` 线显式打成“待清理历史分支”

## Phase B：后端主入口去单体化

从 `fastapi_stream.py` 中优先拆出：

1. `openai_compatible_api.py`
2. `provider_admin_api.py`
3. `auth_api.py`
4. `group_chat_api.py`
5. `legacy_cline_api.py`

目标不是一次性重写，而是先把重复路由和互相覆盖的兼容层拆开。

## Phase C：把聊天主线切到 OpenAI 兼容入口

这一阶段的关键不是“给现有接口换个 `/v1` 路径”，而是把聊天主线真正迁移到新的协议和职责边界上。

执行层设计稿见：`docs/tristaciss-openai-ingress-phase-c-design.md`

1. 落地 `/v1/chat/completions`
2. 在入口中接住 `tag` / `modelTag`
3. 后端统一做 route resolution
4. `/api/chat/stream` 逐步转为兼容层或迁移层

## Phase D：配置系统收敛

1. 统一 snake_case / camelCase 转换边界
2. 去掉重复保存接口
3. 取消前端多处默认 provider 真源
4. 将 `openai_compatible` 与 `provider_mode` 收敛成更少的结构表达

## Phase E：前后端拆分到 `Triavatar`

1. 明确 `avatar-react/` 迁移边界
2. 平滑移动到 `Triavatar`
3. 只保留 Tristaciss 后端所需静态资源与联调文档
4. 建立本地联调脚本与验证清单

## 7. 当前待清理对象清单

以下对象目前最适合进入“待清理/待归档/待确认删除”名单：

### 已处理

- `digital-avatar-react/`

### 强烈建议下一轮处理

- `api-server/cline_server.py`
- `fastapi_stream.py` 中 `/api/cline/*`
- `avatar-react/src/components/dashboard/AIProgrammingCard.tsx`
- `avatar-react/src/components/CodeEditor.tsx`
- `docs/README_CLINE_INTEGRATION.md`
- `fastapi_stream.py` 底部重复的 `/api/providers/config`、`/api/providers/test`、`/api/providers/config` 读取/保存接口

### 待架构确认后再处理

- `providers/openrouter_official.py`
- `avatar-react/src/components/OpenRouterConfig.tsx`
- dual mode 相关文档和测试
- 各类一次性修复脚本，例如 `fix_provider_configs.py`

## 8. 最后结论

一句话总结：Tristaciss 当前最应该做的不是继续往现有单体 `fastapi_stream.py` 和前端配置面里叠功能，而是先把后端统一到 OpenAI 兼容主线、把路由沉到 tag 策略层、把前端从仓内平滑拆到 `Triavatar`，并把 `cline` 与多层配置这类历史分支逐步清走。
