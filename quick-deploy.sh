#!/bin/bash

# Tristaciss - 快速部署脚本 - 修复稳定版（推荐入口）
# 使用方法:
#   1) curl -fsSL https://raw.githubusercontent.com/MoRen9527/Tristaciss/main/quick-deploy.sh | bash
#   2) 或克隆仓库后：chmod +x quick-deploy.sh && ./quick-deploy.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 显示欢迎信息
show_welcome() {
    clear
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Tristaciss 自动部署                          ║"
    echo "║                                                              ║"
    echo "║  🚀 一键部署 React + FastAPI 项目到阿里云服务器                ║"
    echo "║  📦 Docker容器化 + Nginx反向代理                              ║"
    echo "║  🔧 自动化运维脚本 - 最终修复版本                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
}

# 智能权限检测
setup_permissions() {
    if [[ $EUID -eq 0 ]]; then
        SUDO_CMD=""
        log_info "检测到root用户，直接执行管理员命令"
    else
        if sudo -n true 2>/dev/null; then
            SUDO_CMD="sudo"
            log_info "检测到普通用户，使用sudo执行管理员命令"
        else
            log_error "用户没有sudo权限，请确保用户已加入wheel组"
            exit 1
        fi
    fi
}

# 检查系统环境
check_system() {
    log_step "检查系统环境..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        log_info "操作系统: $NAME $VERSION"
    else
        log_error "无法识别操作系统"
        exit 1
    fi
    
    if ping -c 1 8.8.8.8 &> /dev/null; then
        log_info "网络连接正常"
    else
        log_warn "网络连接可能有问题，将使用国内镜像源"
    fi
    
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $DISK_USAGE -gt 80 ]]; then
        log_warn "磁盘使用率较高: ${DISK_USAGE}%"
    else
        log_info "磁盘空间充足: ${DISK_USAGE}% 已使用"
    fi
}

# 更新系统
update_system() {
    log_step "更新系统包..."
    
    ${SUDO_CMD} yum update -y
    ${SUDO_CMD} yum install -y curl wget git vim net-tools python3-pip
    
    log_info "系统更新完成"
}

# 安装Node.js和npm
install_nodejs() {
    log_step "安装Node.js和npm..."
    
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_info "Node.js已安装: $(node --version)"
        log_info "npm已安装: $(npm --version)"
        return
    fi
    
    # 安装Node.js 18.x (LTS版本)
    log_info "添加NodeSource仓库..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | ${SUDO_CMD} bash -
    
    # 安装Node.js和npm
    ${SUDO_CMD} yum install -y nodejs
    
    # 验证安装
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_info "✅ Node.js安装成功: $(node --version)"
        log_info "✅ npm安装成功: $(npm --version)"
    else
        log_error "❌ Node.js安装失败"
        exit 1
    fi
    
    # 配置npm国内镜像源
    npm config set registry https://registry.npmmirror.com
    log_info "npm镜像源已配置为国内源"
}

# 安装Docker
install_docker() {
    log_step "安装Docker..."
    
    if command -v docker &> /dev/null; then
        log_info "Docker已安装: $(docker --version)"
        return
    fi
    
    # 卸载旧版本
    ${SUDO_CMD} yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true
    
    # 安装依赖
    ${SUDO_CMD} yum install -y yum-utils device-mapper-persistent-data lvm2
    
    # 添加Docker仓库（使用阿里云镜像）
    ${SUDO_CMD} yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
    
    # 安装Docker
    ${SUDO_CMD} yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # 配置Docker镜像加速
    ${SUDO_CMD} mkdir -p /etc/docker
    ${SUDO_CMD} tee /etc/docker/daemon.json <<-'EOF'
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://registry.docker-cn.com",
        "https://docker.mirrors.ustc.edu.cn"
    ],
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}
EOF
    
    # 启动Docker
    ${SUDO_CMD} systemctl start docker
    ${SUDO_CMD} systemctl enable docker
    
    # 添加用户到docker组
    if [ "$USER" != "root" ]; then
        ${SUDO_CMD} usermod -aG docker $USER
        log_info "已将用户 $USER 添加到docker组"
    fi
    
    log_info "Docker安装完成"
}

# 安装Docker Compose
install_docker_compose() {
    log_step "安装Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        log_info "Docker Compose已安装: $(docker-compose --version)"
        return
    fi
    
    # 检查是否有Docker Compose插件
    if docker compose version &> /dev/null 2>&1; then
        log_info "Docker Compose插件已安装: $(docker compose version)"
        # 创建docker-compose命令别名
        ${SUDO_CMD} tee /usr/local/bin/docker-compose <<-'EOF'
#!/bin/bash
docker compose "$@"
EOF
        ${SUDO_CMD} chmod +x /usr/local/bin/docker-compose
        log_info "Docker Compose别名创建完成"
        return
    fi
    
    # 手动下载Docker Compose（多个备用源）
    COMPOSE_VERSION="2.20.2"
    ARCH=$(uname -m)
    OS=$(uname -s)
    
    log_info "手动下载Docker Compose v${COMPOSE_VERSION}..."
    
    # 备用下载源列表
    DOWNLOAD_URLS=(
        "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-${OS}-${ARCH}"
        "https://mirror.ghproxy.com/https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-${OS}-${ARCH}"
        "https://ghproxy.net/https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-${OS}-${ARCH}"
    )
    
    # 尝试从不同源下载
    DOWNLOAD_SUCCESS=false
    for url in "${DOWNLOAD_URLS[@]}"; do
        log_info "尝试从 $(echo $url | cut -d'/' -f3) 下载..."
        if ${SUDO_CMD} curl -L --connect-timeout 10 --max-time 300 "$url" -o /usr/local/bin/docker-compose 2>/dev/null; then
            if [[ -f /usr/local/bin/docker-compose ]] && [[ -s /usr/local/bin/docker-compose ]]; then
                log_info "下载成功"
                DOWNLOAD_SUCCESS=true
                break
            fi
        fi
        log_warn "下载失败，尝试下一个源..."
    done
    
    # 如果下载失败，尝试使用pip安装
    if [[ "$DOWNLOAD_SUCCESS" != "true" ]]; then
        log_warn "直接下载失败，尝试使用pip安装..."
        if command -v pip3 &> /dev/null; then
            ${SUDO_CMD} pip3 install docker-compose
            log_info "使用pip3安装Docker Compose完成"
        elif command -v pip &> /dev/null; then
            ${SUDO_CMD} pip install docker-compose
            log_info "使用pip安装Docker Compose完成"
        else
            log_error "无法安装Docker Compose"
            echo "请手动安装Docker Compose："
            echo "方法1: pip3 install docker-compose"
            echo "方法2: 手动下载二进制文件"
            exit 1
        fi
    else
        # 添加执行权限
        ${SUDO_CMD} chmod +x /usr/local/bin/docker-compose
        
        # 创建软链接
        ${SUDO_CMD} ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
        
        log_info "Docker Compose安装完成"
    fi
    
    # 验证安装
    if command -v docker-compose &> /dev/null; then
        log_info "Docker Compose验证成功: $(docker-compose --version)"
    else
        log_error "Docker Compose安装验证失败"
        exit 1
    fi
}

# 配置防火墙
setup_firewall() {
    log_step "配置防火墙..."
    
    if systemctl is-active --quiet firewalld; then
        log_info "配置firewalld规则..."
        ${SUDO_CMD} firewall-cmd --permanent --add-port=80/tcp
        ${SUDO_CMD} firewall-cmd --permanent --add-port=443/tcp
        ${SUDO_CMD} firewall-cmd --permanent --add-port=8008/tcp
        ${SUDO_CMD} firewall-cmd --reload
        log_info "防火墙配置完成"
    else
        log_warn "未检测到防火墙服务，请手动开放端口 80, 443, 8008"
    fi
}

# 下载项目文件
download_project() {
    log_step "下载项目代码..."
    
    REPO_URL="https://github.com/MoRen9527/Tristaciss.git"
    PROJECT_DIR="/opt/tristaciss"
    
    if [[ -d "$PROJECT_DIR/.git" ]]; then
        log_info "检测到Git仓库，更新代码..."
        cd $PROJECT_DIR
        git fetch origin main
        git reset --hard origin/main
    else
        log_info "从GitHub克隆项目: $REPO_URL"
        
        # 确保/opt目录存在且有正确权限
        ${SUDO_CMD} mkdir -p /opt
        ${SUDO_CMD} chmod 755 /opt
        
        # 如果目录已存在，先备份
        if [[ -d "$PROJECT_DIR" ]]; then
            log_warn "目录已存在，创建备份..."
            ${SUDO_CMD} mv $PROJECT_DIR ${PROJECT_DIR}.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        # 使用sudo克隆项目到/opt目录
        ${SUDO_CMD} git clone $REPO_URL $PROJECT_DIR
        
        # 设置目录权限给当前用户
        if [ "$USER" != "root" ]; then
            ${SUDO_CMD} chown -R $USER:$USER $PROJECT_DIR
        fi
        
        cd $PROJECT_DIR
        log_info "项目代码下载完成"
    fi
}

# 预构建前端依赖
prebuild_frontend() {
    log_step "预构建前端依赖..."
    
    cd /opt/tristaciss/avatar-react
    
    # 安装前端依赖
    log_info "安装前端依赖..."
    npm install
    
    # 构建前端
    log_info "构建前端项目..."
    npm run build
    
    log_info "前端预构建完成"
}

# 部署应用
deploy_application() {
    log_step "部署应用..."
    
    cd /opt/tristaciss
    
    # 检查必要文件
    if [[ ! -f "docker-compose.yml" ]]; then
        log_error "未找到 docker-compose.yml 文件"
        exit 1
    fi
    
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
    
    log_info "应用部署完成"
}

# 健康检查
health_check() {
    log_step "执行健康检查..."
    
    cd /opt/tristaciss
    
    # 检查容器状态
    if docker-compose ps | grep -q "Up"; then
        log_info "✅ 容器运行正常"
    else
        log_error "❌ 容器运行异常"
        docker-compose ps
        return 1
    fi
    
    # 检查服务响应
    sleep 10
    
    if curl -f -s http://localhost/health > /dev/null 2>&1; then
        log_info "✅ 前端服务响应正常"
    else
        log_warn "⚠️ 前端服务响应异常，请检查日志"
    fi
    
    if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
        log_info "✅ 后端服务响应正常"
    else
        log_warn "⚠️ 后端服务响应异常，请检查日志"
    fi
}

# 显示部署结果
show_result() {
    log_step "部署完成！"
    
    # 获取服务器IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo
    echo -e "${GREEN}🎉 部署成功！${NC}"
    echo
    echo -e "${BLUE}📋 访问信息：${NC}"
    echo "  🌐 前端地址: http://$SERVER_IP"
    echo "  🔗 API地址: http://$SERVER_IP/api"
    echo "  📊 健康检查: http://$SERVER_IP/health"
    echo
    echo -e "${BLUE}🔧 管理命令：${NC}"
    echo "  查看状态: docker-compose ps"
    echo "  查看日志: docker-compose logs -f"
    echo "  重启服务: docker-compose restart"
    echo "  停止服务: docker-compose down"
    echo
    echo -e "${BLUE}📁 重要目录：${NC}"
    echo "  项目目录: /opt/tristaciss"
    echo "  日志目录: /opt/tristaciss/logs"
    echo "  数据目录: /opt/tristaciss/data"
    echo
    echo -e "${YELLOW}💡 提示：${NC}"
    echo "  - 如需配置域名，请运行 ./setup-domain.sh"
    echo "  - 建议配置SSL证书以启用HTTPS"
    echo "  - 定期备份数据和配置文件"
}

# 主函数
main() {
    show_welcome
    
    setup_permissions
    
    log_info "开始自动部署流程..."
    
    check_system
    update_system
    install_nodejs
    install_docker
    install_docker_compose
    setup_firewall
    download_project
    prebuild_frontend
    deploy_application
    health_check
    show_result
    
    log_info "🎉 部署流程全部完成！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"