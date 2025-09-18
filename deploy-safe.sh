#!/bin/bash

# 安全部署脚本 - 只上传必要文件
# 使用方法: ./deploy-safe.sh

set -e

# 配置
SERVER_IP="47.245.122.61"
SERVER_USER="root"
DEPLOY_PATH="/opt/tristaciss"
PROJECT_NAME="Tristaciss"

echo "🚀 开始安全部署 ${PROJECT_NAME}..."

# 检查必要文件是否存在
if [ ! -f ".deployignore" ]; then
    echo "❌ 未找到 .deployignore 文件，请先创建"
    exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 未找到 docker-compose.yml 文件"
    exit 1
fi

# 创建服务器目录
echo "📁 创建服务器目录..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${DEPLOY_PATH}"

# 使用rsync同步文件（排除垃圾文件）
echo "📤 同步项目文件（排除垃圾文件）..."
rsync -avz \
    --exclude-from='.deployignore' \
    --delete \
    --progress \
    ./ ${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/

# 设置执行权限
echo "🔧 设置脚本执行权限..."
ssh ${SERVER_USER}@${SERVER_IP} "cd ${DEPLOY_PATH} && chmod +x *.sh"

# 执行部署
echo "🐳 执行Docker部署..."
ssh ${SERVER_USER}@${SERVER_IP} "cd ${DEPLOY_PATH} && ./deploy.sh"

echo "✅ 部署完成！"
echo "🌐 访问地址: http://${SERVER_IP}"
echo "📊 健康检查: http://${SERVER_IP}/health"