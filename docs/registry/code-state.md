# Tristaciss Code State

## Repository Map

- `api-server/`：FastAPI 后端主代码面；`start_server.py` 负责启动检查，`fastapi_stream.py` 承接大量主路由，`providers/` 承接 provider 抽象与具体实现。
- `api-server/providers/`：包含 `base.py`、`manager.py`、`openai.py`、`openrouter.py`、`openrouter_official.py`、`glm.py`、`multi_model_router.py`、`free_model_manager.py`。
- `api-server/tests/`：已有 `unit/` 与 `integration/` 目录，但仓根和 `api-server/` 下仍并存多份 `test_*.py` 脚本式测试入口。
- `avatar-react/`：React 18 + Vite 前端；`src/index.tsx` 为入口，`src/App.tsx` 为路由汇总，`src/store/` 承接 Redux，`src/services/api.ts` 承接 API 访问层。
- `docs/`：部署、配置、登录链路、迁移总结与 registry 文档。
- `digital-avatar-react/`：已确认只剩构建产物与依赖目录，本轮深挖中已删除，不再属于现役代码面。
- 根目录部署面：`docker-compose.yml`、`Dockerfile.backend`、`Dockerfile.frontend`、`nginx.conf` 以及各类 `deploy*.sh` / `update*.sh` 脚本。

## Current Code Health

- 仓库已经形成明确的前后端分层，现役主路径可基本收敛到 `api-server/` 与 `avatar-react/`。
- 后端 provider 抽象明确，`ProviderManager` 已承担 provider 注册、默认配置加载与模型到 provider 的路由管理。
- 前端入口明确，Vite、Redux、MUI、通知 Provider、路由守卫都可从少数入口文件顺序读通。
- `api-server` 当前真实运行主线仍是单体 `fastapi_stream.py` + `/api/chat/stream` 自定义入口，还没有进入稳定的 OpenAI 兼容 `/v1` 接口形态。
- 代码健康尚未形成 registry 级量化基线；当前更接近“可运行但历史沉积较重”的状态。

## Change Tracking Baseline

- Provider 实现、默认模型、配置持久化字段、路由路径与部署脚本变化应优先在本文件记录结构影响。
- 若 `avatar-react/` 开始迁移到 `Triavatar`，需要同步记录目录归属变化、环境变量变化与联调测试基线。
- 若聊天入口从 `/api/chat/stream` 收敛到 `/v1/chat/completions` 或 `/v1/responses`，必须在本文件回写这次架构切换。
- 前端若调整 API 基址策略、认证路径、Redux 认证流或路由守卫逻辑，应与后端接口变更一起记录，避免 README 与实现再次漂移。
- 若变化会影响总体商业模式边界，应同步通知 `BusinessStrategy`。
- 涉及具体项目代码仓库时，技术侧文档基线应按 `docs/engineering/DESIGN.md`、技术版 `ROADMAP.md`、技术版 `STATE.md` 以及 `docs/execution/<workstream>/<phase>/PLAN.md`、`SUMMARY.md`、`VERIFICATION.md` 维护；若缺失，应视为待补齐的技术或执行层缺口。

## Git Health

- 尚未建立 registry 级分支或热区摘要。
- 当前从目录分布可见历史产物、临时脚本、虚拟环境、缓存目录与构建目录同时存在，需要后续再做仓库健康收敛。

## Local CodeGraph Index

- 2026-05-24 已在模块根目录建立本地 CodeGraph 索引，由 `TristacissCodeRegistry` 接管摘要与后续维护纪律。
- 当前索引摘要：149 files，1,686 nodes，2,827 edges；语言覆盖 `javascript`、`python`、`tsx`、`typescript`、`yaml`；backend 为 `node-sqlite`。
- `.codegraph/` 仅作为本地缓存与辅助索引，不作为仓库真源提交；后续只在本文件记录扫描摘要、版本锚点、排除规则、入口与调用链发现、待确认缺口。
- 首轮版本锚点：以本次本地扫描时工作区状态为准；后续正式收口时应补充对应 git commit / branch。

## Quality Risks

- `api-server/fastapi_stream.py` 体量较大，且已出现重复导入和重复 provider 配置相关路由声明，说明后端主入口存在持续堆积风险。
- `fastapi_stream.py` 当前同时存在多组重复的 `/api/providers/config`、`/api/providers/test`、`/api/providers/config` 读取/保存端点，说明兼容层和现役层已经互相覆盖。
- 现役聊天入口仍是 `/api/chat/stream`，且 `handle_single_chat()` 直接按 provider 名称创建临时 provider 实例，绕过了稳定的统一路由层；中央定义的 OpenAI 兼容 `/v1` 合同尚未落到运行代码。
- `avatar-react/src/services/ConfigManager.ts`、`ProviderSettings.tsx` 默认值、`localStorage` 回退、`api-server/config_manager.py` JSON 持久化、`openai_compatible/provider_mode` 双口径同时存在，配置层已经超过四层，且字段命名在 camelCase / snake_case 间反复转换。
- `fastapi_stream.py` 底部的兼容保存接口把 `baseUrl/defaultModel/openaiCompatible` 这类前端字段名直接传入 `config_manager.save_provider_config()`，与后端保存器期望的 snake_case 字段不一致，存在配置落盘偏移风险。
- 前端虽然使用 Vite，但 `avatar-react/src/services/api.ts` 仍读取 `process.env.REACT_APP_API_URL`，需要依赖 `vite.config.ts` 中的 `define: { 'process.env': process.env }` 做兼容，这属于环境变量约定不一致风险。
- `cline_server.py`、`/api/cline/*` 端点、`AIProgrammingCard.tsx`、`CodeEditor.tsx` 以及 `README_CLINE_INTEGRATION.md` 代表一条与 Tristaciss 核心 API 平台主线弱相关的历史分支，应进入待清理清单。
- `avatar-react/README.md` 仍保留旧的 Create React App / JavaScript / 接口路径口径，与现役 TypeScript + Vite 实现不完全一致。
- 已删除的 `digital-avatar-react/` 与不存在的 `temp/digital-avatar-app/` 仍在多份旧文档和规则中残留，说明目录真相源与说明文档长期漂移。
- provider 配置 JSON、`.env`、根级脚本、后端缓存与测试脚本并存，意味着配置漂移和环境污染的风险仍然存在。

## Sources

- `../../api-server/start_server.py`
- `../../api-server/fastapi_stream.py`
- `../../api-server/providers/manager.py`
- `../../api-server/providers/openai.py`
- `../../api-server/providers/`
- `../../api-server/tests/`
- `../../avatar-react/package.json`
- `../../avatar-react/vite.config.ts`
- `../../avatar-react/src/index.tsx`
- `../../avatar-react/src/App.tsx`
- `../../avatar-react/src/components/CodeEditor.tsx`
- `../../avatar-react/src/components/dashboard/AIProgrammingCard.tsx`
- `../../avatar-react/src/components/settings/ProviderSettings.tsx`
- `../../avatar-react/src/store/index.ts`
- `../../avatar-react/src/store/authSlice.ts`
- `../../avatar-react/src/services/ConfigManager.ts`
- `../../avatar-react/src/services/api.ts`
- `../../docs/tristaciss-deep-dive-remediation-plan.md`
- `../../avatar-react/README.md`
- `../../AGENTS.md`
- `../../CLAUDE.md`
