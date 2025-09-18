@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Tristaciss项目自动创建仓库和上传代码脚本 (Windows版本)
:: 使用方法: init-repo.bat [your-github-username]

set "PROJECT_NAME=Tristaciss"
set "REPO_DESCRIPTION=三元星球城市空间站 - AI应用生产制造平台"

if "%1"=="" (
    for /f "tokens=*" %%i in ('git config user.name 2^>nul') do set "GITHUB_USERNAME=%%i"
) else (
    set "GITHUB_USERNAME=%1"
)

echo 🚀 Tristaciss项目仓库初始化脚本
echo ==================================================

if "!GITHUB_USERNAME!"=="" (
    echo ❌ 请提供GitHub用户名
    echo 使用方法: init-repo.bat your-github-username
    pause
    exit /b 1
)

echo 📋 项目信息:
echo   项目名称: %PROJECT_NAME%
echo   GitHub用户: !GITHUB_USERNAME!
echo   仓库地址: https://github.com/!GITHUB_USERNAME!/%PROJECT_NAME%
echo.

:: 检查是否已经是Git仓库
if exist ".git" (
    echo ⚠️  检测到已存在Git仓库
    set /p "choice=是否要重新初始化？(y/N): "
    if /i "!choice!"=="y" (
        rmdir /s /q .git
        echo ✅ 已清除现有Git仓库
    ) else (
        echo ℹ️  使用现有Git仓库
    )
)

:: 初始化Git仓库
if not exist ".git" (
    echo 📁 初始化Git仓库...
    git init
    echo ✅ Git仓库初始化完成
)

:: 创建.gitignore文件
echo 📝 创建.gitignore文件...
(
echo # 依赖目录
echo node_modules/
echo .venv/
echo venv/
echo env/
echo.
echo # Python缓存
echo __pycache__/
echo *.pyc
echo *.pyo
echo *.pyd
echo .Python
echo *.so
echo.
echo # 环境配置文件
echo .env
echo .env.local
echo .env.development
echo .env.test
echo .env.production.local
echo.
echo # 日志文件
echo *.log
echo logs/
echo log/
echo.
echo # 系统文件
echo .DS_Store
echo Thumbs.db
echo desktop.ini
echo.
echo # IDE和编辑器
echo .vscode/
echo .idea/
echo *.swp
echo *.swo
echo *~
echo.
echo # 测试和覆盖率
echo coverage/
echo .nyc_output/
echo .coverage
echo .pytest_cache/
echo test-results/
echo.
echo # 构建输出
echo dist/
echo build/
echo .cache/
echo .temp/
echo *.tmp
echo .next/
echo.
echo # 开发记录
echo bug_records/
echo docs/development/
echo.
echo # 备份文件
echo *.backup
echo *.bak
echo config_backups/
echo.
echo # 缓存
echo cache/
echo .cache/
) > .gitignore

:: 创建README.md
echo 📖 创建README.md...
(
echo # 🌟 Tristaciss - 三元星球城市空间站
echo.
echo AI应用生产制造平台 - 基于FastAPI + React的前后端分离架构
echo.
echo ## 🏗️ 项目架构
echo.
echo ```
echo Tristaciss/
echo ├── api-server/              # FastAPI后端
echo │   ├── providers/          # AI服务提供商
echo │   ├── utils/             # 工具函数
echo │   └── start_server.py    # 启动脚本
echo ├── avatar-react/           # React前端
echo │   ├── src/
echo │   │   ├── components/    # React组件
echo │   │   ├── pages/        # 页面组件
echo │   │   ├── services/     # API服务
echo │   │   └── store/        # 状态管理
echo │   └── package.json
echo └── docs/                  # 项目文档
echo ```
echo.
echo ## 🚀 快速开始
echo.
echo ### 后端启动
echo ```bash
echo cd api-server
echo .\.venv\Scripts\activate  # Windows
echo # source .venv/bin/activate  # Linux/Mac
echo python start_server.py
echo ```
echo.
echo ### 前端启动
echo ```bash
echo cd avatar-react
echo npm install
echo npm run dev
echo ```
echo.
echo ## 🐳 Docker部署
echo.
echo ```bash
echo # 安全部署（推荐^）
echo ./deploy-safe.sh
echo.
echo # 或使用Git克隆部署
echo git clone https://github.com/!GITHUB_USERNAME!/%PROJECT_NAME%.git
echo cd %PROJECT_NAME%
echo ./deploy.sh
echo ```
echo.
echo ## 📚 文档
echo.
echo - [部署指南](./三元项目部署方案总结.md^)
echo - [服务器配置](./server-setup.md^)
echo - [详细部署文档](./README_DEPLOYMENT.md^)
echo.
echo ## 🛠️ 技术栈
echo.
echo - **后端**: FastAPI, Python, SQLite
echo - **前端**: React, Material-UI, TypeScript
echo - **部署**: Docker, Nginx, Docker Compose
echo.
echo ## 📄 许可证
echo.
echo MIT License
) > README.md

:: 添加所有文件到Git
echo 📦 添加文件到Git...
git add .
echo ✅ 文件添加完成

:: 检查并配置Git用户信息
echo 🔧 检查Git配置...
git config user.name >nul 2>&1
if errorlevel 1 (
    echo 📝 配置Git用户信息...
    git config --global user.name "!GITHUB_USERNAME!"
    echo ✅ Git用户名已配置: !GITHUB_USERNAME!
)

git config user.email >nul 2>&1
if errorlevel 1 (
    echo 📧 配置Git邮箱...
    git config --global user.email "1615136989@qq.com"
    echo ✅ Git邮箱已配置: 1615136989@qq.com
)

:: 清理可能导致问题的文件
echo 🧹 清理临时文件...
if exist "temp" rmdir /s /q temp >nul 2>&1

:: 提交初始版本
echo 💾 提交初始版本...
git add . >nul 2>&1
git commit -m "🎉 Initial commit: Tristaciss项目初始化 - 添加FastAPI后端 (api-server/) - 添加React前端 (avatar-react/) - 添加Docker部署配置 - 添加安全部署脚本 - 添加项目文档" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  提交可能遇到问题，但继续执行...
) else (
    echo ✅ 初始提交完成
)

:: 尝试自动安装GitHub CLI
echo 🔍 检查GitHub CLI...
gh --version >nul 2>&1
if errorlevel 1 (
    echo 📥 GitHub CLI未安装，尝试自动安装...
    
    :: 检查是否有winget
    winget --version >nul 2>&1
    if not errorlevel 1 (
        echo 🚀 使用winget安装GitHub CLI...
        winget install --id GitHub.cli --silent --accept-package-agreements --accept-source-agreements
        
        :: 重新检查安装
        gh --version >nul 2>&1
        if not errorlevel 1 (
            echo ✅ GitHub CLI安装成功！
        ) else (
            echo ❌ GitHub CLI安装失败，使用备用方案...
            goto :manual_setup
        )
    ) else (
        echo ❌ 无法自动安装GitHub CLI，使用备用方案...
        goto :manual_setup
    )
)

:: 使用GitHub CLI创建仓库
echo 🌐 使用GitHub CLI创建远程仓库...

:: 检查是否已登录
gh auth status >nul 2>&1
if errorlevel 1 (
    echo 🔐 启动GitHub CLI登录...
    echo 请在浏览器中完成GitHub登录...
    gh auth login --web
)

:: 创建仓库
echo 📝 创建GitHub仓库...
gh repo create "!PROJECT_NAME!" --description "!REPO_DESCRIPTION!" --public --source=. --remote=origin --push
if errorlevel 1 (
    echo ❌ 仓库创建失败，使用备用方案...
    goto :manual_setup
) else (
    echo ✅ GitHub仓库创建并推送完成！
    goto :success
)

:manual_setup
echo.
echo 🔧 备用方案：自动打开GitHub创建页面...
start "https://github.com/new?name=!PROJECT_NAME!&description=!REPO_DESCRIPTION!"

git remote add origin "https://github.com/!GITHUB_USERNAME!/!PROJECT_NAME!.git" 2>nul
git branch -M main

echo.
echo 📋 仓库信息已自动填入，请在打开的页面中：
echo   1. 仓库名称: !PROJECT_NAME!
echo   2. 描述: !REPO_DESCRIPTION!
echo   3. 设置为Public或Private
echo   4. 不要初始化README、.gitignore或LICENSE
echo   5. 点击"Create repository"
echo.
echo 创建完成后，自动推送代码...
pause
git push -u origin main
if not errorlevel 1 (
    echo ✅ 代码推送成功！
)

:success

echo.
echo ==================================================
echo 🎉 Tristaciss项目仓库初始化完成！
echo.
echo 📋 项目信息:
echo   🌐 仓库地址: https://github.com/!GITHUB_USERNAME!/%PROJECT_NAME%
echo   📁 本地路径: %CD%
echo   🚀 部署脚本: deploy-safe.sh
echo.
echo 📚 下一步操作:
echo   1. 检查仓库: https://github.com/!GITHUB_USERNAME!/%PROJECT_NAME%
echo   2. 配置部署: 编辑deploy-safe.sh中的服务器信息
echo   3. 开始部署: ./deploy-safe.sh
echo.
echo ✨ 祝您开发愉快！
pause