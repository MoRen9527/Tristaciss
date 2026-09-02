# TriStaciss 8008 常驻化安装说明（CEO 亲装件，候裁生效）

- sourceOfTruth: 本件（Tristaciss/docs/execution/，LG-026 A 案配套 2026-09-02）；syncMode: static；lastSyncedAt: 2026-09-02
- 性质：**候裁件**——BOD 裁前不安装；本件与 `api-server/register-tristaciss-task.ps1`、`api-server/start_server.py` 修正（CTO 派工令 a 件）三件一体
- 现役约束：现役单实例（api-server\.venv PID 29644）零接触不重启；本常驻化任务**不与现役并行抢 8008**

## 一、内容三件

1. `api-server/start_server.py`——启动配置参数化：缺省 `127.0.0.1` + `reload` 关（生产口径）；dev 需要时 env 显式开（`TRISTACISS_HOST` / `TRISTACISS_PORT` / `TRISTACISS_RELOAD=1`）
2. `api-server/register-tristaciss-task.ps1`——schtasks 注册脚本（PowerShell 口径）
3. 本说明件

## 二、安装步骤（BOD 裁后执行）

**第 0 步·凭据注入（必做，CEO 密钥面）**——运行时 key 唯一合法通道=**环境变量**（勘误 2026-09-02T12:4xZ）：

- `config_manager._resolve_configs` 读取面**无条件用 env 覆盖 json 的 api_key**（无 `{PREFIX}_API_KEY` env → 空串）；save 面 normalize 首字段即清空——**在 provider_configs.json 里填 key 结构性无效**（密钥不落盘安全设计，非 bug）
- CEO 设定**用户级**环境变量（ONLOGON 用户身份任务继承用户 env；「此电脑→属性→高级系统设置→环境变量→用户变量」或 PowerShell `[Environment]::SetEnvironmentVariable(name, value, 'User')` 后重登录生效）：

| 环境变量 | 必填 | 说明 |
| --- | --- | --- |
| `GLM_API_KEY` | **是** | GLM provider 运行时凭据（无它 runtime 池不构建，五 provider api_key 全 EMPTY 即此因） |
| `GLM_BASE_URL` | 否 | env 分支缺省 `paas/v4` 与 glm-4；CEO 现 json 内 base_url=anthropic 入口可经此保留（兼容性 ST probe 实测定案） |
| `GLM_DEFAULT_MODEL` | 否 | 同上，env 缺省 glm-4 |

- 前缀对照（config_manager.py:25-41 `_ENV_PREFIX_MAP`，`{PREFIX}_API_KEY` / `{PREFIX}_BASE_URL` / `{PREFIX}_DEFAULT_MODEL` 三键被 resolve 覆盖）：`glm→GLM`、`deepseek→DEEPSEEK`、`anthropic→ANTHROPIC`、`openai→OPENAI`、`openrouter→OPENROUTER`、`qwen→QWEN`、`moonshot→MOONSHOT`、其余 provider 名大写
- json 内 `enabled` / `enabled_models` / `openai_compatible` 等字段**不被 env 覆盖照常生效**（resolve 仅覆盖 api_key / base_url / default_model 三键）——json 的结构性开关照用

**前置检查（一次性）**：

- 确认现役实例处置：新任务在**下次登录**才自动拉起；若届时现役 PID 29644 仍在跑会端口冲突——切换日先停现役（由 BOD 指定时窗，非本件自动做）
- 确认 venv 存在：`D:\Code\ai\Tristaciss\.venv\Scripts\python.exe`

**口径一（推荐，PowerShell）**——工作目录由任务原生支持：

```powershell
powershell -ExecutionPolicy Bypass -File D:\Code\ai\Tristaciss\api-server\register-tristaciss-task.ps1
```

启动命令含 `-X utf8` 双保险（≡ PYTHONUTF8=1；主保险=start_server.py 顶部 stdout/stderr `reconfigure(encoding='utf-8')`，治 ONLOGON 无控制台 GBK 代码页 emoji 崩启）。

**口径二（cmd / schtasks.exe）**——引号方言注意（通道 spec §8.4 教训）：

```cmd
schtasks /Create /TN "TriStaciss-8008" /TR "\"D:\Code\ai\Tristaciss\.venv\Scripts\python.exe\" -X utf8 start_server.py" /SC ONLOGON /DELAY 0001:00 /RU jedih /F
```

- `/TR` 内嵌套引号用 `\"` 转义（cmd 方言；PowerShell 里跑此命令引号规则不同，勿混用）
- **cmd 口径短板如实注明**：schtasks 无工作目录参数，`start_server.py` 相对定位依赖默认工作目录（%WINDIR%\system32，会失败）——cmd 口径装后须补工作目录：`schtasks /Query /TN TriStaciss-8008 /XML > t.xml` 改 XML `<WorkingDirectory>` 后 `schtasks /Create /RU jedih /XML t.xml /F`，或直接用口径一。**推荐口径一**

两口径共同口径：ONLOGON 触发 + 延迟 1 分钟（`PT1M` ≡ `/DELAY 0001:00`）+ 用户身份 jedih（非 SYSTEM，避 8713 SYSTEM 队列怪癖先例）+ RunLevel Limited。

## 三、装后验证（切窗内两步）

1. **服务面活性**：

   ```cmd
   curl http://127.0.0.1:8008/docs
   ```

   预期 HTTP 200（FastAPI /docs 页）。

2. **tmv 链真活**（LG-026 主线回归——TriRLC trimetaverse provider 出站真形态 `tmv-deepseek-v4-flash` 经 8008 出 token）：

   ```cmd
   curl -X POST http://127.0.0.1:8008/v1/messages -H "content-type: application/json" -d "{\"model\":\"tmv-deepseek-v4-flash\",\"max_tokens\":8,\"messages\":[{\"role\":\"user\",\"content\":\"回复一个字：好\"}]}"
   ```

   预期 200 且响应含真实 content（tmv-* 请求名经定案 A 映射到 deepseek provider；TriRLC 侧亦可复跑 triage probe 三件套交叉验证）。

3. 侧证（可选）：`schtasks /Query /TN TriStaciss-8008 /V` 看上次运行结果 0x0。

## 四、回滚

```cmd
schtasks /Delete /TN "TriStaciss-8008" /F
```

（start_server.py 修正随仓回退 `git checkout api-server/start_server.py`；现役实例不受影响。）
