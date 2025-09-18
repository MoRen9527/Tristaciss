#!/bin/bash

# 项目更新脚本

set -e

echo "🔄 开始更新项目..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 备份当前版本
backup_current() {
    log_info "备份当前版本..."
    BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # 备份重要文件
    cp -r api-server/.env $BACKUP_DIR/ 2>/dev/null || log_warn "未找到后端环境文件"
    cp -r avatar-react/.env.* $BACKUP_DIR/ 2>/dev/null || log_warn "未找到前端环境文件"
    
    log_info "备份完成: $BACKUP_DIR"
}

# 拉取最新代码
pull_latest() {
    log_info "拉取最新代码..."
    
    if [[ -d ".git" ]]; then
        git pull origin main
    else
        log_warn "非Git仓库，请手动更新代码"
    fi
}

# 重新构建和部署
rebuild_deploy() {
    log_info "重新构建和部署..."
    
    # 停止服务
    docker-compose down
    
    # 清理旧镜像
    docker system prune -f
    
    # 重新构建
    docker-compose build --no-cache
    
    # 启动服务
    docker-compose up -d
    
    # 等待启动
    sleep 30
    
    # 检查状态
    docker-compose ps
}

# 主函数
main() {
    backup_current
    pull_latest
    rebuild_deploy
    
    log_info "🎉 更新完成！"
}

main "$@"