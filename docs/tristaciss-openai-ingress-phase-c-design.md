# Tristaciss Phase C：OpenAI 兼容入口最小落地设计稿

本文档服务于 Tristaciss 深入摸底后的 Phase C 整改阶段，目标是把“聊天主线切到 OpenAI 兼容入口”这件事落成可执行设计。

它不是现役实现说明，也不替代中央合同；当前真相仍然是：

- 现役聊天主线是 `POST /api/chat/stream`
- 代码面已挂载 `/v1/chat/completions` 的 Phase C 骨架，并且现在已接入真实 route resolution；非流式与流式都会进入已配置 provider 的真实执行链，但当前运行态是否真正出结果仍取决于对应 provider key 是否有效
- `/v1/responses` 仍未落地
- 本文讨论的是下一阶段的最小实现设计，不是现状陈述

本稿主要回答三件事：

1. `/v1/chat/completions` 在 Phase C 最小落地时，最少要接住哪些请求字段、返回哪些响应结构。
2. `tag`、`modelTag`、`routeMeta` 在后端应按什么顺序完成 route resolution，以及在没有显式 override 时如何做意图路由。
3. 现有 `/api/chat/stream` 在迁移期应该保留多久，以及只能退化成什么样的兼容层。

## 1. 设计前提

### 1.1 这不是简单重命名接口

Phase C 的目标不是把 `/api/chat/stream` 改名成 `/v1/chat/completions`，而是把现有“前端专用私有聊天入口”重构成“多客户端可用的统一模型平台入口”。

原因有五个：

1. 现役请求体以 `query`、`provider`、`config` 为核心，不是标准 `messages` 协议。
2. 现役链路要求前端先选 provider，再把 provider 配置直传后端，不具备统一后端路由边界。
3. 现役返回的是自定义 SSE 事件，不是 OpenAI completion chunk 或 response object。
4. 现役认证和调用边界偏页面内私有接口，不是平台代理 key 的外部接入边界。
5. 现役 `/api/chat/stream` 混合了单聊、群聊和前端产品语义，不是后端 ingress 应承担的纯模型接口职责。

因此，Phase C 必须重建这一条主线：

`OpenAI-compatible ingress -> route resolution -> provider binding -> standardized response`

### 1.2 本阶段只做最小可用落地

Phase C 不追求一步把所有合同能力全做完，只要求先把聊天主线迁到正确的协议边界上。

本阶段最小范围：

1. 落地 `POST /v1/chat/completions`
2. 支持标准流式和非流式响应
3. 支持 `tag`、`modelTag`、`routeMeta` 的后端统一路由
4. 把 `/api/chat/stream` 收敛成兼容适配层

本阶段暂不要求一次性完成：

1. 全量 `POST /v1/responses` 语义
2. 全量任务型请求编排
3. 群聊协议并入 OpenAI 兼容入口
4. 所有 provider 特化能力都纳入统一抽象

### 1.2.1 当前自动路由策略（intent-and-cost router v1）

截至 2026-04-25，Phase C 已不再只是“默认 provider 占位路由”，而是进入了一版轻量自动路由：

`explicit provider override -> intent/cost router -> default provider fallback`

当前这一版没有引入额外的“路由模型先判题、再调目标模型”的二跳架构，而是先采用一层启发式 router。这样做的原因很直接：

1. 当前最紧要的是把 DeepSeek / GLM 的真实执行链打通。
2. 参考 RouteLLM / quality-aware routing 这类公开方案，先做 query difficulty + task intent + cost/quality preference 的轻量路由，已经足够把“代码类”和“复杂推理类”分开。
3. 后续若 OpenAI / Anthropic 全部接入且我们接受额外一跳成本，再把这层替换成 learned router 或 model-based judge 更合适。

当前 v1 router 主要看四类信号：

1. `messages` 里的任务类型信号：代码实现 / 调试 / 重构 / API / SQL，还是分析 / 推理 / 比较 / 架构权衡。
2. 请求复杂度信号：文本长度、结构化程度、是否要求 step by step、是否有显式 reasoning 提示。
3. 成本/质量偏好：`policy.costPreference`、`policy.qualityPreference`，以及消息文本中的“预算敏感 / 便宜 / 最高质量”等表达。
4. `workspace.language`、`taskHint.expectedArtifacts` 这类上下文提示。

当前 provider 画像是：

1. DeepSeek：优先承接成本敏感的复杂推理、分析和通用思考任务。
2. GLM：优先承接成本敏感的代码实现、调试、重构与中文代码混合任务。
3. OpenAI：如果未来启用，优先承接质量优先的复杂通用/推理任务。
4. Anthropic：如果未来启用且后端实现落地，优先承接质量优先的代码类任务。

旧的 `/api/chat/stream` 单聊路径也已经支持 `provider=auto`，并复用同一套自动路由能力，便于前端在不大改协议的情况下先做联调。

## 2. `POST /v1/chat/completions` 最小请求模型

### 2.1 最小必接字段

Phase C 最小请求模型建议如下：

| 字段 | 类型 | 必填 | Phase C 说明 |
| --- | --- | --- | --- |
| messages | array | 是 | 必须支持 `system`、`user`、`assistant` |
| model | string | 否 | 可传 `auto` 或为空，由后端结合 `tag`/`modelTag` 决定 |
| stream | boolean | 否 | 默认 `false`；若为 `true`，返回标准流式 chunk |
| temperature | number | 否 | 直传到 provider adapter |
| max_tokens | integer | 否 | 直传到 provider adapter |
| tag | string | 否 | 推荐使用，作为主路由标签 |
| modelTag | string | 否 | 推荐使用，作为模型层标签 |
| routeMeta | object | 否 | 仅接收少量允许字段，如 `provider`、`region`、`tenant` |
| workspace | object | 否 | 先透传，不要求 Phase C 全量消费 |
| policy | object | 否 | 先透传，保留给后续审批和风控 |
| taskHint | object | 否 | Phase C 仅识别 `interactive_chat`；其他类型先走保守拒绝 |
| userMeta | object | 否 | 先透传，用于审计和日志 |

### 2.2 Phase C 不支持的请求能力

为避免协议表面兼容、运行时却半残，Phase C 应明确拒绝以下能力，而不是悄悄忽略：

1. tool calling / function calling
2. 多模态输入附件
3. 音频输出或结构化 response_format
4. 任务型 `taskHint.taskType`，除非值为 `interactive_chat`

建议统一返回 OpenAI error 结构，并使用 Tristaciss 自定义错误码，例如：

- `tmv_feature_not_enabled`
- `tmv_invalid_tag_binding`
- `tmv_task_mode_not_supported`

### 2.3 最小请求示例

```json
{
  "model": "auto",
  "messages": [
    {"role": "system", "content": "你是代码助手"},
    {"role": "user", "content": "帮我分析这个仓库的构建错误"}
  ],
  "stream": true,
  "tag": "coding.analysis",
  "modelTag": "longctx",
  "routeMeta": {
    "region": "cn"
  },
  "taskHint": {
    "taskType": "interactive_chat"
  }
}
```

## 3. `POST /v1/chat/completions` 最小响应模型

### 3.1 非流式响应

非流式响应应遵守标准 Chat Completions 结构，并通过 `tmv` 字段补充平台路由信息。

最小响应示例：

```json
{
  "id": "chatcmpl_001",
  "object": "chat.completion",
  "created": 1770000000,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "已完成分析"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 200,
    "total_tokens": 300
  },
  "tmv": {
    "requestId": "req_001",
    "resolvedTag": "coding.analysis",
    "resolvedModelTag": "longctx",
    "resolvedProvider": "deepseek",
    "resolvedModel": "deepseek-chat",
    "routePolicy": "weighted_primary"
  }
}
```

### 3.2 流式响应

若 `stream = true`，应返回标准 SSE chunk，而不是现有 `start/content/end/error` 自定义事件。

最小 chunk 形态建议：

```text
data: {"id":"chatcmpl_001","object":"chat.completion.chunk","created":1770000000,"model":"deepseek-chat","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl_001","object":"chat.completion.chunk","created":1770000001,"model":"deepseek-chat","choices":[{"index":0,"delta":{"content":"已"},"finish_reason":null}]}

data: {"id":"chatcmpl_001","object":"chat.completion.chunk","created":1770000002,"model":"deepseek-chat","choices":[{"index":0,"delta":{"content":"完成分析"},"finish_reason":null}]}

data: {"id":"chatcmpl_001","object":"chat.completion.chunk","created":1770000003,"model":"deepseek-chat","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"tmv":{"resolvedProvider":"deepseek","resolvedModel":"deepseek-chat"}}

data: [DONE]
```

### 3.3 错误响应

错误响应应统一回到 OpenAI error 结构：

```json
{
  "error": {
    "message": "No available route for tag coding.analysis and modelTag longctx",
    "type": "route_not_found",
    "param": "tag",
    "code": "tmv_route_not_found"
  }
}
```

## 4. `tag`、`modelTag`、`routeMeta` 的 route resolution 顺序

Phase C 的目标是把 provider 选择权收回后端，因此必须先固定统一决策顺序。

### 4.1 建议的决策优先级

1. 先做请求校验，拒绝不支持的消息能力和任务模式。
2. 若 `routeMeta.provider` 明确给出且在允许名单内，则进入固定 provider 路由。
3. 若 `routeMeta.model` 明确给出，则在该 provider 或全局 registry 中校验该模型可用性。
4. 若未固定 provider/model，则根据 `tag + modelTag` 查 route profile。
5. 若 route profile 返回多个候选，则叠加 `workspace`、`tenant`、`region` 等策略覆盖。
6. 对候选池执行健康检查、配额检查、能力检查和可用性过滤。
7. 对剩余候选按成本、延迟、上下文长度、稳定性进行排序。
8. 命中主候选失败时，再按熔断后的降级候选继续尝试。
9. 最终把 `resolvedProvider`、`resolvedModel`、`routePolicy` 写回 `tmv` 元数据。

### 4.2 推荐的 route resolution 伪流程

```text
validate request
  -> normalize model/tag/modelTag
  -> fixed provider/model from routeMeta?
  -> resolve candidates by tag profile
  -> apply workspace or tenant policy overlay
  -> filter by health, auth, quota, capability
  -> rank by cost, latency, context, stability
  -> choose primary candidate
  -> fallback on circuit-break or provider failure
  -> bind provider adapter
  -> return standardized response with tmv metadata
```

### 4.3 Phase C 对 routeMeta 的约束

为了防止 `routeMeta` 重新长成“前端直控 provider 细节”的漏洞，Phase C 必须限制它的能力边界：

1. `routeMeta.provider` 只允许白名单值，不能接受任意 provider 名称拼接。
2. `routeMeta.model` 只能在对应 provider 的可见模型集合里解析。
3. `routeMeta` 只能做固定路由或轻量元数据增强，不能重新承载整包 provider 配置。
4. 不允许通过 `routeMeta` 下传 `api_key`、`base_url`、`default_model` 这类原始 provider 凭据或配置。

## 5. `/api/chat/stream` 的迁移兼容层设计

### 5.1 保留原则

`/api/chat/stream` 在 Phase C 之后仍可短期保留，但它只能作为 legacy adapter，不能继续作为主线 ingress。

它的唯一价值是：

1. 给尚未切到 `/v1/chat/completions` 的 `avatar-react` / `Triavatar` 前端一个短期迁移窗口。
2. 避免当前聊天功能在后端 ingress 切换时一次性断掉。

### 5.2 保留期限应按迁移里程碑，而不是按日历日期

当前仓内没有稳定版本节奏和对外 SLA，因此不建议写“保留 30 天”这类伪精确承诺。

更合理的退出条件是同时满足以下两条：

1. `Triavatar` 现役聊天主链已切到 `/v1/chat/completions`。
2. 仓内已无必须依赖 `provider + config` 直传模式的现役调用方。

在这两个条件满足前，`/api/chat/stream` 可以保留；一旦满足，就进入明确下线期。

### 5.3 兼容层的降级规则

迁移期的 `/api/chat/stream` 不应继续保留全部现有语义，而应主动降级成薄适配层：

1. 单聊请求：允许把 `query` 映射为一条 user message，再转调 `/v1/chat/completions`。
2. `provider` 字段：只允许映射为受控的 `routeMeta.provider`，不能再直接驱动任意临时 provider 分支。
3. `config` 字段：只能用于短期兼容映射，不能再作为后端配置真源，也不能写回持久配置。
4. 群聊请求：不应尝试伪装成 OpenAI 兼容聊天入口，应继续走独立群聊 API 或 WebSocket 主线。
5. 返回体：兼容层可以把标准 chunk 翻译回旧前端所需的 `start/content/end/error` 事件，但这种翻译只允许存在于 legacy adapter 内。
6. 新功能禁入：后续任何新能力，包括工具调用、任务态、审批态、模型发现，都不再加到 `/api/chat/stream`。

### 5.4 兼容层的退场步骤

建议按三段式退出：

1. 适配期：`/api/chat/stream` 内部改为调用新 ingress，并记录 legacy 调用来源。
2. 弃用期：返回弃用警告头或日志告警，禁止新增调用方继续接入。
3. 下线期：当现役调用方切完后，返回 `410 Gone` 或统一错误响应，并最终删除入口。

## 6. Phase C 的接口模型草案与模块拆分清单

### 6.1 拆分原则

当前 `fastapi_stream.py` 顶部已经同时堆了：

- `ChatMessage`
- `ChatRequest`
- `ProviderConfigRequest`
- `UserLogin` / `UserRegister`
- 多个 `Code*Request`

这说明现役主入口已经出现“HTTP 路由、Pydantic 模型、provider 绑定、legacy 兼容逻辑全塞在一个文件里”的问题。

因此，Phase C 的第一条代码组织原则是：

1. 不要继续在 `fastapi_stream.py` 顶部追加新的 OpenAI ingress 模型。
2. 新的 `/v1/chat/completions` 应优先遵守仓里已有 sidecar API 模块的做法，也就是使用独立模块和 `APIRouter` 装配，而不是继续把主逻辑写回 `fastapi_stream.py`。
3. Pydantic 模型必须独立成一份 ingress schema 草案，避免再次和登录、配置、cline、群聊模型混堆。

### 6.2 Pydantic 请求模型草案

这一版草案刻意遵循当前仓里已经在用的 `BaseModel + Field` 风格，不引入只适用于 Pydantic v2 的额外写法。

```python
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class OpenAIChatMessage(BaseModel):
  role: Literal["system", "user", "assistant"] = Field(..., description="消息角色")
  content: str = Field(..., min_length=1, description="消息内容")
  name: Optional[str] = Field(default=None, description="可选消息名")


class TMVRouteMeta(BaseModel):
  provider: Optional[str] = Field(default=None, description="显式 provider 固定路由")
  model: Optional[str] = Field(default=None, description="显式模型固定路由")
  region: Optional[str] = Field(default=None, description="区域偏好")
  tenant: Optional[str] = Field(default=None, description="租户标识")
  latency_class: Optional[str] = Field(default=None, description="延迟等级")


class TMVWorkspaceContext(BaseModel):
  workspace_id: Optional[str] = Field(default=None, description="工作空间标识")
  repo: Optional[str] = Field(default=None, description="仓库名")
  branch: Optional[str] = Field(default=None, description="分支名")
  language: Optional[str] = Field(default=None, description="主要语言")


class TMVPolicyContext(BaseModel):
  require_approval: Optional[bool] = Field(default=None, description="是否需要审批")
  risk_level: Optional[str] = Field(default=None, description="风险等级")
  data_class: Optional[str] = Field(default=None, description="数据等级")


class TMVTaskHint(BaseModel):
  task_type: Optional[str] = Field(default=None, description="任务类型")
  sync_mode: Optional[str] = Field(default=None, description="同步模式")
  expected_artifacts: Optional[List[str]] = Field(default=None, description="预期产物")


class TMVUserMeta(BaseModel):
  user_id: Optional[str] = Field(default=None, description="用户标识")
  team_id: Optional[str] = Field(default=None, description="团队标识")
  session_id: Optional[str] = Field(default=None, description="会话标识")


class OpenAIChatCompletionsRequest(BaseModel):
  messages: List[OpenAIChatMessage] = Field(..., min_length=1, description="标准消息数组")
  model: Optional[str] = Field(default="auto", description="模型名或 auto")
  stream: bool = Field(default=False, description="是否流式输出")
  temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0, description="采样温度")
  max_tokens: Optional[int] = Field(default=None, gt=0, description="最大输出 token")
  tag: Optional[str] = Field(default=None, description="业务路由标签")
  model_tag: Optional[str] = Field(default=None, alias="modelTag", description="模型标签")
  route_meta: Optional[TMVRouteMeta] = Field(default=None, alias="routeMeta", description="路由元数据")
  workspace: Optional[TMVWorkspaceContext] = Field(default=None, description="工作空间上下文")
  policy: Optional[TMVPolicyContext] = Field(default=None, description="策略上下文")
  task_hint: Optional[TMVTaskHint] = Field(default=None, alias="taskHint", description="任务提示")
  user_meta: Optional[TMVUserMeta] = Field(default=None, alias="userMeta", description="用户上下文")
```

这组模型的几个约束要写死：

1. `messages` 只接受文本消息，不在 Phase C 假装支持多模态 parts。
2. `modelTag`、`routeMeta`、`taskHint`、`userMeta` 对外保留 camelCase 合同，对内字段统一用 snake_case 映射。
3. `routeMeta` 只承载轻量路由提示，绝不能重新放回 `api_key`、`base_url` 这类 provider 原始配置。
4. `taskHint.taskType` 若不是 `interactive_chat`，应在 ingress 校验阶段直接拒绝，而不是落到 provider 层才失败。

### 6.3 Pydantic 响应模型草案

非流式、流式和错误响应建议各有一组最小模型，避免把 chunk 和 final response 混成一个字典结构。

```python
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AssistantMessage(BaseModel):
  role: Literal["assistant"] = Field(default="assistant")
  content: str = Field(..., description="最终回答内容")


class ChatCompletionChoice(BaseModel):
  index: int = Field(..., description="候选序号")
  message: AssistantMessage = Field(..., description="最终消息")
  finish_reason: Optional[str] = Field(default=None, description="结束原因")


class UsageInfo(BaseModel):
  prompt_tokens: int = Field(..., ge=0)
  completion_tokens: int = Field(..., ge=0)
  total_tokens: int = Field(..., ge=0)


class TMVResolutionMeta(BaseModel):
  request_id: str = Field(..., alias="requestId")
  resolved_tag: Optional[str] = Field(default=None, alias="resolvedTag")
  resolved_model_tag: Optional[str] = Field(default=None, alias="resolvedModelTag")
  resolved_provider: str = Field(..., alias="resolvedProvider")
  resolved_model: str = Field(..., alias="resolvedModel")
  route_policy: str = Field(..., alias="routePolicy")


class OpenAIChatCompletionsResponse(BaseModel):
  id: str = Field(...)
  object: Literal["chat.completion"] = Field(default="chat.completion")
  created: int = Field(...)
  model: str = Field(...)
  choices: List[ChatCompletionChoice] = Field(...)
  usage: UsageInfo = Field(...)
  tmv: TMVResolutionMeta = Field(...)


class ChatCompletionDelta(BaseModel):
  role: Optional[Literal["assistant"]] = Field(default=None)
  content: Optional[str] = Field(default=None)


class ChatCompletionChunkChoice(BaseModel):
  index: int = Field(...)
  delta: ChatCompletionDelta = Field(...)
  finish_reason: Optional[str] = Field(default=None)


class OpenAIChatCompletionChunkResponse(BaseModel):
  id: str = Field(...)
  object: Literal["chat.completion.chunk"] = Field(default="chat.completion.chunk")
  created: int = Field(...)
  model: str = Field(...)
  choices: List[ChatCompletionChunkChoice] = Field(...)
  tmv: Optional[TMVResolutionMeta] = Field(default=None)


class OpenAIErrorBody(BaseModel):
  message: str = Field(...)
  type: str = Field(...)
  param: Optional[str] = Field(default=None)
  code: str = Field(...)


class OpenAIErrorResponse(BaseModel):
  error: OpenAIErrorBody = Field(...)
```

这里最重要的不是字段有多全，而是三件事必须分开：

1. final completion response
2. streaming chunk response
3. error response

只要这三层不分开，后面代码就很容易重新回到“动态 dict 到处传”的状态。

### 6.4 模块拆分清单

结合当前仓里已有的 `config_api.py`、`exchange_rate_api.py` 这种 sidecar 模块形态，Phase C 建议采用“最小侵入式拆分”，先把新入口从 `fastapi_stream.py` 旁路拆出去。

第一版建议的模块边界如下：

| 模块 | 建议路径 | 核心职责 | 明确不要做的事 |
| --- | --- | --- | --- |
| OpenAI ingress router | `api-server/openai_compatible_api.py` | 定义 `APIRouter`、接住 `/v1/chat/completions`、完成请求校验与响应装配 | 不直接写 provider 分支判断 |
| Ingress schemas | `api-server/openai_ingress_models.py` | 放置请求、响应、错误三类 Pydantic 模型 | 不依赖 FastAPI app、provider manager |
| Chat service | `api-server/openai_chat_service.py` | 处理 ingress 归一化、调用 route resolver、调用 provider adapter | 不暴露 HTTP 层细节 |
| Route resolver | `api-server/route_resolver.py` | 解析 `tag`、`modelTag`、`routeMeta`，返回候选 provider/model | 不负责 SSE 拼装 |
| Legacy adapter | `api-server/legacy_chat_stream_adapter.py` | 把旧 `/api/chat/stream` 请求映射到新 ingress，并翻译旧 SSE 事件 | 不再成为配置真源 |

### 6.5 模块拆分顺序

建议按下面顺序拆，而不是一起大改：

1. 先新增 `openai_ingress_models.py`，把 Phase C 的 Pydantic 模型从 `fastapi_stream.py` 彻底隔离开。
2. 再新增 `openai_compatible_api.py`，只做 router 和请求/响应协议装配。
3. 再新增 `openai_chat_service.py`，承接 provider 无关的聊天主线逻辑。
4. 然后新增 `route_resolver.py`，把路由决策从 HTTP 层抽走。
5. 最后把旧 `/api/chat/stream` 改成 `legacy_chat_stream_adapter.py` 的入口代理。

这样拆的原因是：

1. 先拆模型，能防止 `fastapi_stream.py` 顶部继续长胖。
2. 先有 router 和 service，再接 legacy adapter，才能避免“旧接口永远绕开新 ingress”。
3. route resolver 只有在 ingress schema 已固定后拆，才能少一次字段重命名反复。

### 6.6 模块接线清单

如果 Phase C 进入代码实现，第一轮接线至少要完成下面这些动作：

1. 在 `fastapi_stream.py` 启动装配处引入 `openai_compatible_api.router`。
2. 把 `openai_compatible_api.router` 挂到主 `FastAPI` 应用。
3. 确保 `openai_chat_service.py` 通过显式依赖拿到 `ProviderManager` 或 provider registry，而不是自己再 new 一套全局状态。
4. 确保 `legacy_chat_stream_adapter.py` 内部调用的是新 service 或新 ingress 逻辑，而不是继续复制旧的 `handle_single_chat()`。
5. 在日志或审计层记录 legacy adapter 的调用来源，为后续下线提供依据。

### 6.7 一轮代码评审时必须检查的反模式

如果后续进入实现，这几类做法应该直接视为 Phase C 跑偏：

1. 在 `fastapi_stream.py` 顶部继续新增 `OpenAI*Request`、`OpenAI*Response` 模型。
2. 在 `openai_compatible_api.py` 内部直接写 `if provider == ...` 的 provider 分支树。
3. 在 `route_resolver.py` 里引入 `StreamingResponse`、`JSONResponse` 或其他 HTTP 输出对象。
4. 在 `legacy_chat_stream_adapter.py` 中继续接受或持久化整包 `config` 作为后端真源。
5. 为了图快，把标准 chunk 又翻译回旧 `start/content/end/error` 之后，再把它当成新 ingress 的内部协议。

## 7. 验收标准

Phase C 最小落地完成，至少应满足以下检查：

1. 标准 OpenAI SDK 可以直接调用 `/v1/chat/completions`。
2. `messages` 多轮上下文可以正常透传到 provider adapter。
3. `tag + modelTag` 可以在后端完成统一 route resolution。
4. 流式响应符合 `chat.completion.chunk` 和 `[DONE]` 结束语义。
5. `/api/chat/stream` 已退化为兼容层，而不是继续承载主线业务判断。
6. 任何 provider 凭据都不再从前端聊天请求直接下传为长期真源。
7. 群聊能力未被错误塞进 OpenAI 兼容聊天入口。

## 8. 与现有文档的关系

本稿与其他文档的边界如下：

1. 中央合同真源：`TriMetaverse/docs/contracts/tristaciss-openai-compatible-api-contract.md`
2. 模块整改总草案：`docs/tristaciss-deep-dive-remediation-plan.md`
3. 模块新人导读：`docs/tristaciss-module-baseline-guide.md`

如果后续 Phase C 的字段或降级策略发生调整，应优先保持与中央合同一致，再同步回整改草案和模块导读。
