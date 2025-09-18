@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Tristaciss项目代码更新和推送脚本 (Windows版本)
:: 使用方法: update-repo.bat "提交信息"

if "%1"=="" (
    set "COMMIT_MSG=📝 更新项目代码"
) else (
    set "COMMIT_MSG=%~1"
)

echo 🔄 Tristaciss项目代码更新脚本
echo ==================================================

:: 检查是否在Git仓库中
if not exist ".git" (
    echo ❌ 当前目录不是Git仓库
    echo 请先运行: init-repo.bat
    pause
    exit /b 1
)

:: 检查是否有远程仓库
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo ❌ 未配置远程仓库
    echo 请先运行: init-repo.bat
    pause
    exit /b 1
)

:: 显示当前状态
echo 📊 当前Git状态:
git status --short

:: 检查是否有更改
git status --porcelain >nul 2>&1
if errorlevel 1 (
    echo ℹ️  没有检测到文件更改
    set /p "choice=是否要强制推送？(y/N): "
    if /i not "!choice!"=="y" (
        echo 👋 操作已取消
        pause
        exit /b 0
    )
) else (
    echo 📦 添加所有更改...
    git add .
    echo ✅ 文件添加完成
)

:: 提交更改
echo 💾 提交更改...
echo 提交信息: !COMMIT_MSG!

git diff --cached --quiet >nul 2>&1
if not errorlevel 1 (
    echo ℹ️  没有暂存的更改，跳过提交
) else (
    git commit -m "!COMMIT_MSG!"
    echo ✅ 提交完成
)

:: 推送到远程仓库
echo 🚀 推送到远程仓库...
git push origin main

echo ✅ 代码推送完成！

:: 显示仓库信息
for /f "tokens=*" %%i in ('git remote get-url origin') do set "REPO_URL=%%i"
echo.
echo ==================================================
echo 🎉 代码更新完成！
echo.
echo 📋 仓库信息:
echo   🌐 仓库地址: !REPO_URL!
echo   📝 最新提交: !COMMIT_MSG!
echo   🕒 推送时间: %date% %time%
echo.
echo 💡 提示:
set "WEB_URL=!REPO_URL:.git=!"
echo   - 查看仓库: !WEB_URL!
echo   - 部署项目: ./deploy-safe.sh
echo.
pause