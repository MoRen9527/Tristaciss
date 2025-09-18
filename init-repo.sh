#!/bin/bash

# Tristaciss项目自动创建仓库和上传代码脚本
# 使用方法: ./init-repo.sh [your-github-username]

set -e

# 配置
PROJECT_NAME="Tristaciss"
REPO_DESCRIPTION="三元星球城市空间站 - AI应用生产制造平台"
GITHUB_USERNAME="${1:-$(git config user.name)}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Tristaciss项目仓库初始化脚本${NC}"
echo "=================================================="

# 检查GitHub用户名
if [ -z "$GITHUB_USERNAME" ]; then
    echo -e "${RED}❌ 请提供GitHub用户名${NC}"
    echo "使用方法: ./init-repo.sh your-github-username"
    exit 1
fi

echo -e "${YELLOW}📋 项目信息:${NC}"
echo "  项目名称: $PROJECT_NAME"
echo "  GitHub用户: $GITHUB_USERNAME"
echo "  仓库地址: https://github.com/$GITHUB_USERNAME/$PROJECT_NAME"
echo ""

# 检查是否已经是Git仓库
if [ -d ".git" ]; then
    echo -e "${YELLOW}⚠️  检测到已存在Git仓库${NC}"
    read -p "是否要重新初始化？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf .git
        echo -e "${GREEN}✅ 已清除现有Git仓库${NC}"
    else
        echo -e "${BLUE}ℹ️  使用现有Git仓库${NC}"
    fi
fi

# 初始化Git仓库
if [ ! -d ".git" ]; then
    echo -e "${BLUE}📁 初始化Git仓库...${NC}"
    git init
    echo -e "${GREEN}✅ Git仓库初始化完成${NC}"
fi

# 创建.gitignore文件
echo -e "${BLUE}📝 创建.gitignore文件...${NC}"
cat > .gitignore << 'EOF'
# 依赖目录
node_modules/
.venv/
venv/
env/

# Python缓存
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.so

# 环境配置文件
.env
.env.local
.env.development
.env.test
.env.production.local

# 日志文件
*.log
logs/
log/

# 系统文件
.DS_Store
Thumbs.db
desktop.ini

# IDE和编辑器
.vscode/
.idea/
*.swp
*.swo
*~

# 测试和覆盖率
coverage/
.nyc_output/
.coverage
.pytest_cache/
test-results/

# 构建输出
dist/
build/
.cache/
.temp/
*.tmp
.next/

# 开发记录
bug_records/
docs/development/

# 备份文件
*.backup
*.bak
config_backups/

# 缓存
cache/
.cache/
EOF

# 创建README.md
echo -e "${BLUE}📖 创建README.md...${NC}"
cat > README.md << EOF
# 🌟 Tristaciss - 三元星球城市空间站

AI应用生产制造平台 - 基于FastAPI + React的前后端分离架构

## 🏗️ 项目架构

\`\`\`
Tristaciss/
├── api-server/              # FastAPI后端
│   ├── providers/          # AI服务提供商
│   ├── utils/             # 工具函数
│   └── start_server.py    # 启动脚本
├── avatar-react/           # React前端
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API服务
│   │   └── store/        # 状态管理
│   └── package.json
└── docs/                  # 项目文档
\`\`\`

## 🚀 快速开始

### 后端启动
\`\`\`bash
cd api-server
.\.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac
python start_server.py
\`\`\`

### 前端启动
\`\`\`bash
cd avatar-react
npm install
npm run dev
\`\`\`

## 🐳 Docker部署

\`\`\`bash
# 安全部署（推荐）
./deploy-safe.sh

# 或使用Git克隆部署
git clone https://github.com/$GITHUB_USERNAME/$PROJECT_NAME.git
cd $PROJECT_NAME
./deploy.sh
\`\`\`

## 📚 文档

- [部署指南](./三元项目部署方案总结.md)
- [服务器配置](./server-setup.md)
- [详细部署文档](./README_DEPLOYMENT.md)

## 🛠️ 技术栈

- **后端**: FastAPI, Python, SQLite
- **前端**: React, Material-UI, TypeScript
- **部署**: Docker, Nginx, Docker Compose

## 📄 许可证

MIT License
EOF

# 添加所有文件到Git
echo -e "${BLUE}📦 添加文件到Git...${NC}"
git add .
echo -e "${GREEN}✅ 文件添加完成${NC}"

# 提交初始版本
echo -e "${BLUE}💾 提交初始版本...${NC}"
git commit -m "🎉 Initial commit: Tristaciss项目初始化

- 添加FastAPI后端 (api-server/)
- 添加React前端 (avatar-react/)  
- 添加Docker部署配置
- 添加安全部署脚本
- 添加项目文档"

echo -e "${GREEN}✅ 初始提交完成${NC}"

# 检查GitHub CLI是否安装
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI未安装，将使用手动方式${NC}"
    echo -e "${BLUE}📋 请手动执行以下步骤:${NC}"
    echo "1. 访问 https://github.com/new"
    echo "2. 仓库名称: $PROJECT_NAME"
    echo "3. 描述: $REPO_DESCRIPTION"
    echo "4. 设置为Public或Private"
    echo "5. 不要初始化README、.gitignore或LICENSE"
    echo "6. 创建仓库后，执行以下命令:"
    echo ""
    echo -e "${GREEN}git remote add origin https://github.com/$GITHUB_USERNAME/$PROJECT_NAME.git${NC}"
    echo -e "${GREEN}git branch -M main${NC}"
    echo -e "${GREEN}git push -u origin main${NC}"
    echo ""
    
    # 设置远程仓库
    git remote add origin "https://github.com/$GITHUB_USERNAME/$PROJECT_NAME.git" 2>/dev/null || true
    git branch -M main
    
    echo -e "${YELLOW}🔗 远程仓库已配置，请手动创建GitHub仓库后执行:${NC}"
    echo -e "${GREEN}git push -u origin main${NC}"
    
else
    # 使用GitHub CLI创建仓库
    echo -e "${BLUE}🌐 使用GitHub CLI创建远程仓库...${NC}"
    
    # 检查是否已登录
    if ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}🔐 请先登录GitHub CLI:${NC}"
        gh auth login
    fi
    
    # 创建仓库
    echo -e "${BLUE}📝 创建GitHub仓库...${NC}"
    gh repo create "$PROJECT_NAME" \
        --description "$REPO_DESCRIPTION" \
        --public \
        --source=. \
        --remote=origin \
        --push
    
    echo -e "${GREEN}✅ GitHub仓库创建并推送完成！${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Tristaciss项目仓库初始化完成！${NC}"
echo ""
echo -e "${BLUE}📋 项目信息:${NC}"
echo "  🌐 仓库地址: https://github.com/$GITHUB_USERNAME/$PROJECT_NAME"
echo "  📁 本地路径: $(pwd)"
echo "  🚀 部署脚本: ./deploy-safe.sh"
echo ""
echo -e "${YELLOW}📚 下一步操作:${NC}"
echo "  1. 检查仓库: https://github.com/$GITHUB_USERNAME/$PROJECT_NAME"
echo "  2. 配置部署: 编辑deploy-safe.sh中的服务器信息"
echo "  3. 开始部署: ./deploy-safe.sh"
echo ""
echo -e "${GREEN}✨ 祝您开发愉快！${NC}"