#!/bin/bash

# 服务监控脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查服务状态
check_services() {
    echo -e "${BLUE}=== 服务状态检查 ===${NC}"
    
    # Docker服务状态
    if systemctl is-active --quiet docker; then
        log_info "✅ Docker服务正常运行"
    else
        log_error "❌ Docker服务未运行"
    fi
    
    # 容器状态
    echo
    echo -e "${BLUE}=== 容器状态 ===${NC}"
    docker-compose ps
    
    # 健康检查
    echo
    echo -e "${BLUE}=== 健康检查 ===${NC}"
    
    # 前端检查
    if curl -f -s http://localhost/health > /dev/null; then
        log_info "✅ 前端服务健康"
    else
        log_error "❌ 前端服务异常"
    fi
    
    # 后端检查
    if curl -f -s http://localhost/api/health > /dev/null; then
        log_info "✅ 后端服务健康"
    else
        log_error "❌ 后端服务异常"
    fi
}

# 查看资源使用情况
check_resources() {
    echo
    echo -e "${BLUE}=== 资源使用情况 ===${NC}"
    
    # 系统资源
    echo "CPU和内存使用："
    top -bn1 | head -5
    
    echo
    echo "磁盘使用："
    df -h
    
    echo
    echo "Docker资源使用："
    docker stats --no-stream
}

# 查看日志
view_logs() {
    echo
    echo -e "${BLUE}=== 最近日志 ===${NC}"
    
    echo "前端日志："
    docker-compose logs --tail=10 frontend
    
    echo
    echo "后端日志："
    docker-compose logs --tail=10 backend
}

# 网络连接检查
check_network() {
    echo
    echo -e "${BLUE}=== 网络连接检查 ===${NC}"
    
    # 检查端口监听
    echo "端口监听状态："
    netstat -tlnp | grep -E ':(80|443|8008)'
    
    # 检查外网访问
    echo
    echo "外网IP地址："
    curl -s ifconfig.me
}

# 主菜单
show_menu() {
    echo
    echo -e "${BLUE}=== 三元星球城市空间站项目监控面板 ===${NC}"
    echo "1. 服务状态检查"
    echo "2. 资源使用情况"
    echo "3. 查看日志"
    echo "4. 网络连接检查"
    echo "5. 完整检查"
    echo "6. 实时监控"
    echo "0. 退出"
    echo
}

# 实时监控
real_time_monitor() {
    echo -e "${BLUE}=== 实时监控模式 (按Ctrl+C退出) ===${NC}"
    
    while true; do
        clear
        echo "$(date '+%Y-%m-%d %H:%M:%S')"
        check_services
        check_resources
        sleep 5
    done
}

# 主函数
main() {
    while true; do
        show_menu
        read -p "请选择操作 (0-6): " choice
        
        case $choice in
            1)
                check_services
                ;;
            2)
                check_resources
                ;;
            3)
                view_logs
                ;;
            4)
                check_network
                ;;
            5)
                check_services
                check_resources
                view_logs
                check_network
                ;;
            6)
                real_time_monitor
                ;;
            0)
                echo "退出监控"
                exit 0
                ;;
            *)
                log_warn "无效选择，请重新输入"
                ;;
        esac
        
        echo
        read -p "按回车键继续..."
    done
}

main "$@"