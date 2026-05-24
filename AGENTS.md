# Tristaciss Agent Rules

本文件由 `CLAUDE.md` 派生，用作 Tristaciss 的根级委派入口。
在 `TristacissProductRegistry` 建立模块级 README 基线前，优先使用本文件和 `CLAUDE.md` 作为 agent 指南真源。

## Project Overview

- Tristaciss 是一个 AI 应用生产制造平台，包含数字分身系统和科幻主题 UI。
- 本模块当前包含三部分：
  - `avatar-react/`：当前 React 前端实现；本轮深挖完成后计划平滑迁移到 `Triavatar`
  - `api-server/`：当前 FastAPI 后端真源
  - 遗留 Vue 演示路径 `temp/digital-avatar-app/` 当前已不在仓内；任何仍提到它或 `digital-avatar-react/` 的文档都属于历史口径

## Module Role

- Tristaciss 负责模型 SDK 接口转换、API 平台、并发承载、云端与本地模型对接。
- 当商业模式涉及 API 调用、模型调用、前端统一接口到后端多提供商路由、提供商适配时，必须考虑本模块。

## Local Commands

### Frontend

- `cd avatar-react`
- `npm run dev`
- `npm start`
- `npm run build`
- `npm test`

### Backend

- `cd api-server`
- `.\.venv\scripts\activate`
- `python start_server.py`
- `python test_api.py`
- `python test_glm.py`
- `python test_deepseek.py`
- `python config_api.py`

## Architecture Notes

- 前端：React 18 + TypeScript + Redux Toolkit + Material UI
- 后端：FastAPI + 多提供商抽象
- 提供商实现位于 `api-server/providers/`
- 提供商配置示例位于 `api-server/provider_configs.example.json`；本地 `api-server/provider_configs.json` 被忽略，不作为仓库真源提交；API Key 只从环境变量或本地密钥配置读取
- 当前现役聊天入口仍是 `POST /api/chat/stream`；代码面虽已挂载 Phase C 的 `/v1/chat/completions` scaffold 骨架，但它还不是可用的 OpenAI 兼容实现，`/v1/responses` 也仍未落地
- Flask 备用服务 `cline_server.py` 基本废弃，不应优先作为现役真源

## Strategy Delegation

- 总商业模式、当前商业实验、Tristaciss 在当前路径中的优先级、与其他模块的边界，先咨询 `TriMetaverse/BusinessStrategy`。
- Tristaciss 不在本地自行决定总体商业模式，只维护本模块事实。

## Local Fact Sources

- 产品事实优先看：`CLAUDE.md`、部署文档、PRD、架构文档
- 代码事实优先看：`api-server/`、`avatar-react/`、`tests/`
- 深入摸底与整改结论优先看：`docs/tristaciss-deep-dive-remediation-plan.md`

## Current Registries

- `TristacissBusinessStrategyRegistry`
- `TristacissProductRegistry`
- `TristacissCodeRegistry`

当前 registry agent canonical discovery 位于 `Tristaciss/.github/agents/`。同名中央 discovery 文件不应在 `TriMetaverse/.github/agents/` 并行保留；中央只通过 manifest 和 registry closeout 工作流路由本模块 registry。

## Update Discipline

- 在 `TristacissProductRegistry` 建立模块 README 基线前，不要把根目录 `README.md` 当作唯一产品真源。
- 涉及提供商、接口路由和部署差异时，优先给出事实来源，再给出下一步需要查询的 registry 或代码路径。
