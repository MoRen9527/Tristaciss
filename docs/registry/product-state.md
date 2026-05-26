# TriStaciss Product State

## Module Overview

- `TriStaciss` 是模型路由中转站和 API 调用平台；当前物理仓库路径仍为 `Tristaciss/`，在显式 repo rename 前继续作为兼容路径。
- 它负责多提供商模型接入、统一 API 转接、provider 配置、模型路由、成本控制、模型适用边界判断和官方 SDK 能力边界适配。
- 它不是服务域主控模块，不承接 `TriMC` 的统一运行面语义；当前产品定位收敛为“模型 API 后端 + provider 配置工作台”，不再把前端登录、聊天、群聊 WebSocket 和仪表盘作为本模块产品归属。

## Current Product Scope

- 对外提供统一的模型 API 平台能力，包括聊天、流式响应、provider 选择、模型列表暴露和官方 SDK 适配。
- 对内为 `TriMC`、`TriPilot`、`TriAvatar` 等模块提供模型路由、API 调用、成本控制和 provider 能力边界支撑。
- 为当前阶段的多 provider 接入、配置测试、部署上线与运维排障提供独立工作面。
- 当前产品真源仍以 `AGENTS.md`、`CLAUDE.md`、部署文档和专项技术指南为主；根级 `README.md` 只能作为概览，不应视作唯一产品真源。
- 涉及具体项目代码仓库时，产品侧文档基线应按 `PROJECT.md`、`REQUIREMENTS.md`、产品版 `ROADMAP.md` 和产品版 `STATE.md` 维护；若缺失，应视为待补齐的产品真源缺口。

## Current Progress

- 已建立 `docs/registry/` 工作层，并具备 `product-state.md`、`code-state.md`、`README.md`。
- 已具备 FastAPI 后端启动入口 `api-server/start_server.py` 与主应用 `api-server/fastapi_stream.py`。
- 产品归属已收敛为 `api-server/` 后端平台；若仓内仍保留 `avatar-react/` 前端代码，应视为迁移期兼容 / legacy 实现，不再作为 TriStaciss 的目标产品面。
- 已具备 provider 设置、模型列表、聊天流式接口等后端 API 功能面。
- 已具备部署和排障文档，包括根级部署指南和 `docs/React + FastAPI 登录流程完整指南.md` 这类可面向新人解释调用链的技术说明。
- 已确认 `digital-avatar-react/` 只是历史残留目录，并已在本轮深挖中清理移除。
- 已明确下一阶段的结构目标：TriStaciss 收敛到 `api-server/` 后端平台，前端登录、聊天、群聊 WebSocket、仪表盘和 Web 入口归 `TriAvatar` 产品侧承接。

## Bug And Gap State

- 根目录 `README.md` 与 `avatar-react/README.md` 仍混有旧口径：它们不能单独代表当前产品事实。
- 历史文档与规则仍混有 `temp/digital-avatar-app/` 与 `digital-avatar-react/` 口径；其中后者已确认无用并删除，任何剩余引用都应视为待清理历史说明。
- 前端 README 把登录接口写成 `/api/auth/login`，但现役前后端链路实际使用 `/api/login`，文档口径尚未完全统一。
- 产品边界尚未完成物理仓清理：当前若仍存在 `avatar-react/`，其产品归属已经转向 `TriAvatar`，迁移前后的职责与联调清单需要单独收口。
- 当前对外聊天入口仍是自定义 `/api/chat/stream`，与中央 OpenAI 兼容合同之间仍存在产品接口层缺口。
- 产品层仍缺少更稳定的 `PROJECT.md`、`REQUIREMENTS.md` 等真源基线，导致“平台定位”“试点范围”“对外能力边界”仍分散在多份说明文档中。
- 多 provider、部署模式、遗留前端、测试入口并存，容易让新人误把样板、遗留或临时路径当成现役能力。

## Cross-Module Dependencies

- 与 `TriMetaverse` 对齐总体商业模式和模块边界，不在本仓内重写中央战略。
- 当前最可能为 `TriPilot`、`TriAvatar`、`TriMC` 等模块提供模型 API、provider 配置、官方 SDK 调用和集成入口支持；其中 `TriAvatar` 已被明确为前端体验承接模块。
- provider 密钥、默认模型和配置持久化目前主要在本仓后端管理，尚未看到已稳定外置到其他用户系统模块的证据。

## Architecture State

- 现役目标产品面由 `api-server/`、根级部署脚本与 `docs/` 中的说明文档共同构成。
- `api-server/` 负责模型与 provider 路由、配置与测试 API、聊天流式接口、官方 SDK 适配和 API 后端配合。
- 当前深挖目标是把前后端边界做实：TriStaciss 应收敛为后端平台，前端由 `TriAvatar` 承接。
- `digital-avatar-react/` 已确认为无用历史残留并删除；任何旧 README、规则或脚手架若仍引用该路径，都不应再视为产品事实。

## Sources

- `../../AGENTS.md`
- `../../CLAUDE.md`
- `../../README.md`
- `../../docs/tristaciss-deep-dive-remediation-plan.md`
- `../../docs/React + FastAPI 登录流程完整指南.md`
- `../../api-server/start_server.py`
- `../../api-server/fastapi_stream.py`
- `../../avatar-react/src/App.tsx`
- `../../avatar-react/src/pages/LoginPage.tsx`
- `../../avatar-react/src/services/api.ts`
