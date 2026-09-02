# TriStaciss 8008 常驻化注册脚本（LG-026 A 案候裁件 2026-09-02）
# 适用 shell：Windows PowerShell 5.1 / pwsh 7+（cmd 口径见
# docs/execution/tristaciss-8008-daemon-install.md，引号方言差异已逐条注明）。
# 本脚本只注册 schtasks 登录触发任务——不启动服务进程、不动现役 8008 实例。
# 口径：ONLOGON 触发 + 延迟 1 分钟 + 用户身份 jedih（非 SYSTEM，避 8713 SYSTEM
# 队列怪癖先例）+ venv python 全路径 + 工作目录钉 api-server/。
param(
    [string]$RepoRoot = 'D:\Code\ai\Tristaciss',
    [string]$TaskName = 'TriStaciss-8008',
    [string]$UserId = 'jedih'
)

$ErrorActionPreference = 'Stop'

$venvPython = Join-Path $RepoRoot '.venv\Scripts\python.exe'
$workDir = Join-Path $RepoRoot 'api-server'
if (-not (Test-Path $venvPython)) { throw "venv python 不存在: $venvPython" }
if (-not (Test-Path (Join-Path $workDir 'start_server.py'))) { throw "start_server.py 不存在于: $workDir" }

# GBK emoji 崩启双保险（CTO 补令第四件 2026-09-02）：-X utf8 ≡ PYTHONUTF8=1
# （UTF-8 mode，Python 3.7+）——原生 Task 结构直接进 Argument，免 cmd set 包装
# 引号方言问题；start_server.py 内 reconfigure 为主保险，此处为辅。
$action = New-ScheduledTaskAction -Execute $venvPython -Argument '-X utf8 start_server.py' -WorkingDirectory $workDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $UserId
$trigger.Delay = 'PT1M'  # schtasks /DELAY 0001:00 等价（ISO8601 时长）

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -UserId $UserId -RunLevel Limited -Force `
    -Description 'TriStaciss Anthropic-compatible gateway :8008 (LG-026 A 案常驻化, 2026-09-02)'

Write-Host "已注册任务 $TaskName（ONLOGON +1min / 用户 $UserId / venv python 全路径 / 工作目录 $workDir）"
Write-Host '本脚本未立即启动进程；装后验证见 docs/execution/tristaciss-8008-daemon-install.md'
Write-Host "（手动试跑可用: schtasks /Run /TN `"$TaskName`"）"
