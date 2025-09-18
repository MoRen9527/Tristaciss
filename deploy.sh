#!/bin/bash

# 三元星球城市空间站项目自动部署脚本
# 适用于 Alibaba Cloud Linux 3.2104 LTS

set -e

echo "🚀 开始部署 AI 学习项目..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查用户权限
check_user_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_warn "检测到root用户，建议使用普通用户运行"
        SUDO_CMD=""
        read -p "是否继续使用root用户？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_info "当前用户: $USER"
        # 检查sudo权限
        if sudo -n true 2>/dev/null; then
            log_info "sudo权限正常"
            SUDO_CMD="sudo"
        else
            log_error "当前用户没有sudo权限，请确保用户已加入wheel组"
            echo "解决方法："
            echo "1. 切换到root用户: su -"
            echo "2. 将用户加入wheel组: usermod -aG wheel $USER"
            echo "3. 重新登录用户"
            exit 1
        fi
    fi
}

# 安装Docker
install_docker() {
    log_info "检查Docker安装状态..."
    
    if command -v docker &> /dev/null; then
        log_info "Docker已安装，版本: $(docker --version)"
    else
        log_info "安装Docker..."
        
        # 更新系统
        ${SUDO_CMD} yum update -y
        
        # 安装必要的包
        ${SUDO_CMD} yum install -y yum-utils device-mapper-persistent-data lvm2
        
        # 添加Docker仓库
        ${SUDO_CMD} yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        
        # 安装Docker
        ${SUDO_CMD} yum install -y docker-ce docker-ce-cli containerd.io
        
        # 启动Docker服务
        ${SUDO_CMD} systemctl start docker
        ${SUDO_CMD} systemctl enable docker
        
        # 添加当前用户到docker组
        if [ "$USER" != "root" ]; then
            ${SUDO_CMD} usermod -aG docker $USER
            log_info "已将用户 $USER 添加到docker组，请重新登录以生效"
        fi
        
        log_info "Docker安装完成"
    fi
}

# 安装Docker Compose
install_docker_compose() {
    log_info "检查Docker Compose安装状态..."
    
    if command -v docker-compose &> /dev/null; then
        log_info "Docker Compose已安装，版本: $(docker-compose --version)"
    else
        log_info "安装Docker Compose..."
        
        # 下载Docker Compose
        ${SUDO_CMD} curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        
        # 添加执行权限
        ${SUDO_CMD} chmod +x /usr/local/bin/docker-compose
        
        # 创建软链接
        ${SUDO_CMD} ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
        
        log_info "Docker Compose安装完成"
    fi
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    # 检查firewalld状态
    if systemctl is-active --quiet firewalld; then
        log_info "配置firewalld规则..."
        ${SUDO_CMD} firewall-cmd --permanent --add-port=80/tcp
        ${SUDO_CMD} firewall-cmd --permanent --add-port=443/tcp
        ${SUDO_CMD} firewall-cmd --permanent --add-port=8008/tcp
        ${SUDO_CMD} firewall-cmd --reload
    else
        log_warn "firewalld未运行，请手动配置防火墙规则"
    fi
}

# 创建必要的目录和文件
setup_directories() {
    log_info "创建必要的目录..."
    
    # 创建日志目录
    mkdir -p logs
    
    # 创建数据目录
    mkdir -p data
    
    # 设置权限
    chmod 755 logs data
}

# 检查环境文件
check_env_files() {
    log_info "检查环境配置文件..."
    
    if [[ ! -f "api-server/.env" ]]; then
        log_warn "未找到后端环境配置文件 api-server/.env"
        log_info "请确保已正确配置环境变量"
    fi
    
    if [[ ! -f "avatar-react/.env.production" ]]; then
        log_warn "未找到前端生产环境配置文件"
        log_info "将使用默认配置"
    fi
}

# 构建和启动服务
deploy_services() {
    log_info "构建和启动服务..."
    
    # 停止现有服务
    docker-compose down 2>/dev/null || true
    
    # 构建镜像
    log_info "构建Docker镜像..."
    docker-compose build --no-cache
    
    # 启动服务
    log_info "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    docker-compose ps
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查前端
    if curl -f http://localhost/health &> /dev/null; then
        log_info "✅ 前端服务正常"
    else
        log_error "❌ 前端服务异常"
    fi
    
    # 检查后端（通过nginx代理）
    if curl -f http://localhost/api/health &> /dev/null; then
        log_info "✅ 后端服务正常"
    else
        log_error "❌ 后端服务异常"
    fi
}

# 显示部署信息
show_deployment_info() {
    log_info "部署完成！"
    echo
    echo "📋 部署信息："
    echo "  - 前端地址: http://$(curl -s ifconfig.me)"
    echo "  - 本地访问: http://localhost"
    echo "  - API地址: http://$(curl -s ifconfig.me)/api"
    echo
    echo "🔧 管理命令："
    echo "  - 查看日志: docker-compose logs -f"
    echo "  - 重启服务: docker-compose restart"
    echo "  - 停止服务: docker-compose down"
    echo "  - 更新部署: ./deploy.sh"
    echo
    echo "📁 重要目录："
    echo "  - 日志目录: ./logs"
    echo "  - 数据目录: ./data"
}

# 主函数
main() {
    log_info "三元星球城市空间站项目自动部署脚本 v1.0"
    echo
    
    check_user_permissions
    install_docker
    install_docker_compose
    configure_firewall
    setup_directories
    check_env_files
    deploy_services
    health_check
    show_deployment_info
    
    log_info "🎉 部署完成！"
}

# 执行主函数
main "$@"