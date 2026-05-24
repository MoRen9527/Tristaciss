# Tristaciss Business State

## Registry Role

- 本文件是 `Tristaciss` 的 business registry 工作层。
- `Tristaciss` 的 `product-state.md` 与 `code-state.md` 默认应以本文件作为业务上游约束。

## Module Business Role

- `Tristaciss` 负责模型 API 平台、多 provider 接入、路由与计量相关能力。
- 在当前阶段，它也是平台管理控制台的过渡承载仓，负责 provider 配置、模型启停、运维与对外 API 合同收口。

## Current Default Business Position

- 当前默认定位是“模型 API 平台 + 平台管理控制面过渡承载仓”。
- 历史上它同时混合了承载前端交互面、provider 配置工作台与模型平台的职责；当前方向是逐步把用户前端体验迁往 `Triavatar`，而 `Tristaciss` 收敛到后端平台与管理控制面。

## Current Business Modes

1. 平台托管模式：用户使用 `Tristaciss` 发放的凭证，入口和 base URL 都指向 `Tristaciss`，由平台负责充值、token 计量、provider 路由和真实上游密钥维护。
2. BYOK 代理模式：用户绑定自己的 provider key，但请求仍经由 `Tristaciss` 代理执行；`Tristaciss` 负责路由、审计、限流与统一调用合同，上游消耗默认记在用户自己的 provider 账户侧。
3. 直连 BYOK：允许作为未来可选边界预留，但当前不作为默认主路径；一旦浏览器或终端直接访问 provider，`Tristaciss` 在路由、审计和平台计量上的控制力会下降。

## Boundary Notes

- `Tristaciss` 不是服务域主控，不承接 `TriMC` 的统一运行面语义。
- 用户前台体验、Web 入口和未来用户级设置应逐步由 `Triavatar` 承接；平台 provider 配置、计量、路由和管理登录边界继续留在 `Tristaciss`。
- 涉及总体商业实验和模块边界变化时，应先回到中央 `BusinessStrategy`。

## Sources

- `../../AGENTS.md`
- `../../CLAUDE.md`
- `../../docs/provider-management-boundary-2026-04-26.md`
- `../../avatar-react/src/App.tsx`
- `../../avatar-react/src/pages/LoginPage.tsx`
- `../../api-server/fastapi_stream.py`