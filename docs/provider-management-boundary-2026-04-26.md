# Tristaciss Provider 与凭证边界整理

## 背景

- Triavatar 已开始收口为终端用户前端，不再暴露平台 provider 配置入口。
- Tristaciss 现有 `avatar-react/` 仍保留 provider 配置、模型启停和测试登录入口，更接近平台管理端雏形。
- 未来希望同时支持两类用户消费模式：
  - 平台托管模式：用户持有平台发放的凭证或额度，由 Tristaciss 负责路由到真实模型。
  - 用户自带密钥模式：用户绑定自己的 provider key。

## 当前判断

### 可以确认的方向

1. Triavatar 应继续保持为用户前台，不再承载平台 provider 开关、路由策略和后台维护能力。
2. Tristaciss 应承担平台 provider registry、模型目录、路由策略、模型启停、计量与管理 API。
3. `avatar-react/` 可以短期作为 Tristaciss 的平台管理端承接壳，但语义上应视为管理控制台，而不是继续当用户产品前台。

### 风险点

1. 不建议把“用户自带 key”直接实现成浏览器直连第三方 provider。
原因：会削弱统一路由、审计、限流、失败回退和 token 计量能力，也会把 secret 暴露给浏览器运行时。
2. 不建议把 TriMem 立即定性为“原始 provider key 托管仓”。
原因：TriMem 当前还没有成熟的认证、审计、撤销、轮换和密钥生命周期能力。
3. 不建议继续把平台管理能力和普通用户设置语义混放。
原因：这会让 Triavatar、Tristaciss、未来 TriMem 的职责边界继续漂移。

## 推荐方案

### 1. 平台托管模式

- 用户在 Triavatar 中只看到平台套餐、可用模型、额度和使用量。
- 用户调用统一进入 Tristaciss。
- Tristaciss 根据平台策略决定 provider、模型、回退链路和成本归集。
- 真实 provider key 只由平台在服务端维护。

### 2. 用户自带密钥模式

- 产品语义可以叫 BYOK，但技术路径仍建议经由 Tristaciss 代理执行，而不是浏览器直连 provider。
- Tristaciss 负责：
  - 校验用户提交的 key 是否可用
  - 将调用归属到用户凭证
  - 保持统一的路由、审计、限流和 token 计量
  - 决定是否允许某些模型仍走平台代理增强逻辑

### 3. TriMem 的正式定位

- 第一阶段：只做用户凭证目录与授权关系，不直接承接原始第三方 key 托管。
- 第二阶段：当 TriMem 具备认证、审计、撤销、轮换、加密和访问策略后，再升级为共享凭证中枢。
- 在此之前，如果需要跨端复用用户凭证，应优先设计“凭证引用 + 服务端密钥域”而不是“多个前端共享同一明文字段”。

## 本轮整理的最小落地

1. `avatar-react/src/App.tsx`
   - 应用启动时恢复会话状态。
   - `/chat-only` 与 `/dashboard-only` 收回到鉴权内。
2. `avatar-react/src/pages/LoginPage.tsx`
   - 登录页明确标记为平台管理控制台入口。
3. `avatar-react/src/components/settings/UserSettings.tsx`
   - 设置页文案改成平台管理语义。
   - 明确说明该页不等于未来终端用户自带密钥入口。

## 下一步建议

1. 在 Tristaciss 中拆出独立的 admin 路由或独立构建目标，避免继续沿用“用户设置”语义。
2. 为 provider 配置、模型启停、路由策略、额度与 token 计量建立后台 RBAC。
3. 为未来用户 BYOK 设计独立的数据合同：
   - credential_id
   - owner_user_id
   - provider
   - secret_ref
   - scope
   - status
   - last_validated_at
4. 在 Triavatar 中只保留“消费模式选择”和“账户额度/凭证状态展示”，不直接复活旧 ProviderSettings。