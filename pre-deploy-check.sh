#!/bin/bash

# 部署前检查脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

# 检查项目文件结构
check_project_structure() {
    log_check "检查项目文件结构..."
    
    local required_files=(
        "api-server/requirements.txt"
        "api-server/fastapi_stream.py"
        "api-server/start_server.py"
        "avatar-react/package.json"
        "avatar-react/src"
        "Dockerfile.backend"
        "Dockerfile.frontend"
        "docker-compose.yml"
        "nginx.conf"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ -f "$file" || -d "$file" ]]; then
            log_info "找到: $file"
        else
            log_error "缺失: $file"
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "缺失 ${#missing_files[@]} 个必要文件"
        return 1
    else
        log_info "项目文件结构检查通过"
        return 0
    fi
}

# 检查环境配置文件
check_env_files() {
    log_check "检查环境配置文件..."
    
    # 检查后端环境文件
    if [[ -f "api-server/.env" ]]; then
        log_info "找到后端环境配置文件"
        
        # 检查关键配置项
        if grep -q "API_HOST" api-server/.env; then
            log_info "API_HOST 配置存在"
        else
            log_warn "建议添加 API_HOST 配置"
        fi
        
        if grep -q "API_PORT" api-server/.env; then
            log_info "API_PORT 配置存在"
        else
            log_warn "建议添加 API_PORT 配置"
        fi
    else
        log_warn "未找到后端环境配置文件 api-server/.env"
        log_info "将创建默认配置文件..."
        create_default_backend_env
    fi
    
    # 检查前端环境文件
    if [[ -f "avatar-react/.env.production" ]]; then
        log_info "找到前端生产环境配置文件"
    else
        log_warn "未找到前端生产环境配置文件"
        log_info "将创建默认配置文件..."
        create_default_frontend_env
    fi
}

# 创建默认后端环境配置
create_default_backend_env() {
    cat > api-server/.env << 'EOF'
# 服务配置
API_HOST=0.0.0.0
API_PORT=8008
DEBUG=false

# 数据库配置
DATABASE_URL=sqlite:///./chat_history.db

# CORS配置
CORS_ORIGINS=["*"]

# 日志配置
LOG_LEVEL=INFO
EOF
    log_info "已创建默认后端环境配置文件"
}

# 创建默认前端环境配置
create_default_frontend_env() {
    cat > avatar-react/.env.production << 'EOF'
# API配置
VITE_API_BASE_URL=/api
VITE_WS_URL=/ws

# 生产环境配置
VITE_NODE_ENV=production
EOF
    log_info "已创建默认前端环境配置文件"
}

# 检查Docker配置
check_docker_config() {
    log_check "检查Docker配置文件..."
    
    # 检查docker-compose.yml语法
    if command -v docker-compose &> /dev/null; then
        if docker-compose config &> /dev/null; then
            log_info "docker-compose.yml 语法正确"
        else
            log_error "docker-compose.yml 语法错误"
            return 1
        fi
    else
        log_warn "Docker Compose未安装，跳过语法检查"
    fi
    
    # 检查Dockerfile
    if [[ -f "Dockerfile.backend" ]]; then
        log_info "后端Dockerfile存在"
    else
        log_error "后端Dockerfile缺失"
        return 1
    fi
    
    if [[ -f "Dockerfile.frontend" ]]; then
        log_info "前端Dockerfile存在"
    else
        log_error "前端Dockerfile缺失"
        return 1
    fi
}

# 检查网络端口
check_ports() {
    log_check "检查端口占用情况..."
    
    local ports=(80 443 8008)
    
    for port in "${ports[@]}"; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            log_warn "端口 $port 已被占用"
            netstat -tlnp | grep ":$port "
        else
            log_info "端口 $port 可用"
        fi
    done
}

# 检查系统资源
check_system_resources() {
    log_check "检查系统资源..."
    
    # 检查内存
    local mem_total=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    local mem_available=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    
    if [[ $mem_total -lt 2048 ]]; then
        log_warn "系统内存较少: ${mem_total}MB (建议至少4GB)"
    else
        log_info "系统内存充足: ${mem_total}MB"
    fi
    
    if [[ $mem_available -lt 1024 ]]; then
        log_warn "可用内存较少: ${mem_available}MB"
    else
        log_info "可用内存充足: ${mem_available}MB"
    fi
    
    # 检查磁盘空间
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    local disk_available=$(df -h / | awk 'NR==2 {print $4}')
    
    if [[ $disk_usage -gt 80 ]]; then
        log_warn "磁盘使用率较高: ${disk_usage}%"
    else
        log_info "磁盘空间充足: ${disk_usage}% 已使用，${disk_available} 可用"
    fi
}

# 检查基础环境
check_basic_environment() {
    log_check "检查基础环境..."
    
    local env_ok=true
    
    # 检查curl (必需，用于下载部署脚本)
    if command -v curl &> /dev/null; then
        log_info "curl已安装"
    else
        log_error "curl未安装 (必需工具)"
        echo "  安装命令: yum install -y curl (阿里云Linux) 或 apt install -y curl (Ubuntu)"
        env_ok=false
    fi
    
    # 检查wget (备用下载工具)
    if command -v wget &> /dev/null; then
        log_info "wget已安装"
    else
        log_warn "wget未安装 (建议安装)"
        echo "  安装命令: yum install -y wget (阿里云Linux) 或 apt install -y wget (Ubuntu)"
    fi
    
    # 检查用户权限
    if [ "$EUID" -eq 0 ]; then
        log_info "当前为root用户，权限充足"
    else
        log_warn "当前为普通用户，部署时可能需要管理员权限"
        # 检查sudo权限（仅Ubuntu/Debian系统）
        if command -v sudo &> /dev/null && sudo -n true 2>/dev/null; then
            log_info "sudo权限正常"
        else
            log_warn "无sudo权限或系统不支持sudo命令"
        fi
    fi
    
    return $([ "$env_ok" = true ] && echo 0 || echo 1)
}

# 检查可选服务状态 (仅提示，不影响部署)
check_optional_services() {
    log_check "检查可选服务状态 (仅供参考)..."
    
    echo -e "${YELLOW}注意: 以下服务检查仅供参考，quick-deploy.sh会自动安装所需服务${NC}"
    echo
    
    # 检查Docker (可选检查)
    if command -v docker &> /dev/null; then
        log_info "Docker已安装: $(docker --version)"
        
        # 检查Docker服务状态
        if systemctl is-active --quiet docker 2>/dev/null; then
            log_info "Docker服务运行正常"
        else
            log_warn "Docker服务未运行 (部署脚本会自动启动)"
        fi
        
        # 检查Docker权限
        if docker ps &> /dev/null 2>&1; then
            log_info "Docker权限正常"
        else
            log_warn "当前用户可能没有Docker权限 (部署脚本会自动配置)"
        fi
    else
        log_warn "Docker未安装 (部署脚本会自动安装)"
    fi
    
    # 检查Docker Compose (可选检查)
    if command -v docker-compose &> /dev/null; then
        log_info "Docker Compose已安装: $(docker-compose --version)"
    elif docker compose version &> /dev/null 2>&1; then
        log_info "Docker Compose (plugin)已安装: $(docker compose version)"
    else
        log_warn "Docker Compose未安装 (部署脚本会自动安装)"
    fi
    
    # 检查Git (可选)
    if command -v git &> /dev/null; then
        log_info "Git已安装: $(git --version)"
    else
        log_warn "Git未安装 (部署脚本会自动安装)"
    fi
    
    # 检查防火墙状态
    if command -v ufw &> /dev/null; then
        local ufw_status=$(ufw status | head -1)
        log_info "防火墙状态: $ufw_status"
        
        if ufw status | grep -q "80/tcp"; then
            log_info "端口80已开放"
        else
            log_warn "端口80未开放 (部署脚本会自动配置)"
        fi
        
        if ufw status | grep -q "443/tcp"; then
            log_info "端口443已开放"
        else
            log_warn "端口443未开放 (部署脚本会自动配置)"
        fi
    else
        log_info "未检测到ufw防火墙 (部署脚本会自动配置)"
    fi
}

# 检查网络连接
check_network() {
    log_check "检查网络连接..."
    
    # 检查外网连接
    if ping -c 1 8.8.8.8 &> /dev/null; then
        log_info "外网连接正常"
    else
        log_warn "外网连接可能有问题"
    fi
    
    # 检查Docker Hub连接
    if curl -s --connect-timeout 5 https://hub.docker.com &> /dev/null; then
        log_info "Docker Hub连接正常"
    else
        log_warn "Docker Hub连接可能有问题，建议使用国内镜像"
    fi
    
    # 检查GitHub连接 (用于拉取代码)
    if curl -s --connect-timeout 5 https://github.com &> /dev/null; then
        log_info "GitHub连接正常"
    else
        log_warn "GitHub连接可能有问题"
    fi
}

# 生成部署报告
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="pre-deploy-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "三元星球城市空间站项目部署前检查报告"
        echo "生成时间: $timestamp"
        echo "========================================"
        echo
        echo "系统信息:"
        uname -a
        echo
        echo "内存信息:"
        free -h
        echo
        echo "磁盘信息:"
        df -h
        echo
        echo "网络信息:"
        ip addr show | grep -E "inet.*global"
        echo
        echo "Docker信息:"
        if command -v docker &> /dev/null; then
            docker --version
            docker info 2>/dev/null | head -10
        else
            echo "Docker未安装"
        fi
        echo
        echo "端口占用:"
        netstat -tlnp | grep -E ":(80|443|8008) "
        echo
    } > "$report_file"
    
    log_info "检查报告已生成: $report_file"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    部署前环境检查                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
    
    local check_passed=true
    
    # 执行各项检查
    check_basic_environment || check_passed=false
    echo
    
    check_project_structure || check_passed=false
    echo
    
    check_env_files
    echo
    
    check_docker_config || check_passed=false
    echo
    
    check_ports
    echo
    
    check_system_resources
    echo
    
    check_network
    echo
    
    check_optional_services
    echo
    
    # 生成报告
    generate_report
    echo
    
    # 显示检查结果
    if [[ "$check_passed" == true ]]; then
        log_info "🎉 所有检查项通过，可以开始部署！"
        echo
        echo -e "${GREEN}建议的部署命令：${NC}"
        echo "  # 本地部署 (如果已有完整项目文件)"
        echo "  chmod +x deploy.sh && ./deploy.sh"
        echo
        echo "  # 或使用快速部署 (自动安装所有依赖)"
        echo "  curl -fsSL https://raw.githubusercontent.com/MoRen9527/Tristaciss/main/quick-deploy.sh | bash"
    else
        log_error "❌ 部分检查项未通过，请修复后再部署"
        echo
        echo -e "${YELLOW}修复建议：${NC}"
        echo "  1. 确保所有必要文件存在"
        echo "  2. 检查配置文件语法"
        echo "  3. 释放被占用的端口"
        echo "  4. 确保系统资源充足"
    fi
    
    echo
    echo -e "${BLUE}如需帮助，请查看：${NC}"
    echo "  - 部署文档: README_DEPLOYMENT.md"
    echo "  - 服务器配置: server-setup.md"
}

# 执行主函数
main "$@"