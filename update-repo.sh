#!/bin/bash

# Tristaciss项目代码更新和推送脚本
# 使用方法: ./update-repo.sh "提交信息"

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取提交信息
COMMIT_MSG="${1:-"📝 更新项目代码"}"

echo -e "${BLUE}🔄 Tristaciss项目代码更新脚本${NC}"
echo "=================================================="

# 检查是否在Git仓库中
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ 当前目录不是Git仓库${NC}"
    echo "请先运行: ./init-repo.sh"
    exit 1
fi

# 检查是否有远程仓库
if ! git remote get-url origin &> /dev/null; then
    echo -e "${RED}❌ 未配置远程仓库${NC}"
    echo "请先运行: ./init-repo.sh"
    exit 1
fi

# 显示当前状态
echo -e "${BLUE}📊 当前Git状态:${NC}"
git status --short

# 检查是否有更改
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}ℹ️  没有检测到文件更改${NC}"
    read -p "是否要强制推送？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}👋 操作已取消${NC}"
        exit 0
    fi
else
    echo -e "${BLUE}📦 添加所有更改...${NC}"
    git add .
    echo -e "${GREEN}✅ 文件添加完成${NC}"
fi

# 提交更改
echo -e "${BLUE}💾 提交更改...${NC}"
echo "提交信息: $COMMIT_MSG"

if git diff --cached --quiet; then
    echo -e "${YELLOW}ℹ️  没有暂存的更改，跳过提交${NC}"
else
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✅ 提交完成${NC}"
fi

# 推送到远程仓库
echo -e "${BLUE}🚀 推送到远程仓库...${NC}"
git push origin main

echo -e "${GREEN}✅ 代码推送完成！${NC}"

# 显示仓库信息
REPO_URL=$(git remote get-url origin)
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 代码更新完成！${NC}"
echo ""
echo -e "${BLUE}📋 仓库信息:${NC}"
echo "  🌐 仓库地址: $REPO_URL"
echo "  📝 最新提交: $COMMIT_MSG"
echo "  🕒 推送时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo "  - 查看仓库: ${REPO_URL//.git/}"
echo "  - 部署项目: ./deploy-safe.sh"
echo ""