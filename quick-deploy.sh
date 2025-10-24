#!/bin/bash

# Tristaciss - 快速部署脚本 - 适用于阿里云服务器
# 使用方法: curl -fsSL https://raw.githubusercontent.com/MoRen9527/Tristaciss/main/quick-deploy.sh | bash

set -e

# 颜色定义（使用 tput，自动适配终端类型，兼容性更好）：
# RED    ：红色文本（setaf 1）
# GREEN  ：绿色文本（setaf 2）
# YELLOW ：黄色文本（setaf 3）
# BLUE   ：蓝色文本（setaf 4）
# NC     ：重置终端颜色（sgr0）
# 用法示例：echo -e "${RED}这是红色${NC}"
# tput 会根据 $TERM 环境变量自动选择合适的控制码，适用于大多数终端和远程环境。
RED="$(tput setaf 1)"      # 红色
GREEN="$(tput setaf 2)"    # 绿色
YELLOW="$(tput setaf 3)"   # 黄色
BLUE="$(tput setaf 4)"     # 蓝色
NC="$(tput sgr0)"          # 终端重置（No Color）

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
    echo "║  🔧 自动化运维脚本                                            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
}

# 检查系统环境
check_system() {
    log_step "检查系统环境..."
    
    # 检查操作系统
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        log_info "操作系统: $NAME $VERSION"
    else
        log_error "无法识别操作系统"
        exit 1
    fi
    
    # 检查网络连接
    if ping -c 1 8.8.8.8 &> /dev/null; then
        log_info "网络连接正常"
    else
        log_warn "网络连接可能有问题，将使用国内镜像源"
    fi
    
    # 检查磁盘空间，awk取出第二行第五个字段（使用率），去掉百分号
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
    
    if command -v yum &> /dev/null; then
        ${SUDO_CMD} yum update -y
        ${SUDO_CMD} yum install -y curl wget git vim net-tools python3-pip
    elif command -v apt &> /dev/null; then
        ${SUDO_CMD} apt update -y
        ${SUDO_CMD} apt upgrade -y
        ${SUDO_CMD} apt install -y curl wget git vim net-tools python3-pip
    else
        log_error "不支持的包管理器"
        exit 1
    fi
    
    log_info "系统更新完成"
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
        log_info "已将用户 $USER 添加到docker组，请重新登录以生效"
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
    elif systemctl is-active --quiet ufw; then
        log_info "配置ufw规则..."
        ${SUDO_CMD} ufw allow 80/tcp
        ${SUDO_CMD} ufw allow 443/tcp
        ${SUDO_CMD} ufw allow 8008/tcp
        log_info "防火墙配置完成"
    else
        log_warn "未检测到防火墙服务，请手动开放端口 80, 443, 8008"
    fi
}

# 创建项目目录
setup_project() {
    log_step "设置项目目录..."
    
    PROJECT_DIR="/opt/tristaciss"
    
    # 如果/opt目录不存在则创建
    if [[ ! -d /opt ]]; then
        ${SUDO_CMD} mkdir -p /opt
    else
        log_info "/opt 目录已存在，无需创建"
    fi
    
    log_info "项目将部署到: $PROJECT_DIR"
}

# 下载项目文件
download_project() {
    log_step "下载项目代码..."
    
    # 从GitHub克隆项目
    REPO_URL="https://github.com/MoRen9527/Tristaciss.git"
<<<<<<< HEAD
    PROJECT_DIR="/opt/tristaciss"
    
    if [[ -d "$PROJECT_DIR/.git" ]]; then
        log_info "检测到Git仓库，更新代码..."
        cd $PROJECT_DIR
        # 自动检测当前分支并拉取
        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        log_info "当前分支: $CURRENT_BRANCH，拉取最新代码..."
        git pull origin "$CURRENT_BRANCH"
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
=======
    
    if [[ -d ".git" ]]; then
        log_info "检测到Git仓库，更新代码..."
        git pull origin main
    else
        log_info "从GitHub克隆项目: $REPO_URL"
        cd /opt
        
        # 如果目录已存在，先备份
        if [[ -d "tristaciss" ]]; then
            log_warn "目录已存在，创建备份..."
            ${SUDO_CMD} mv tristaciss tristaciss.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        # 克隆项目
        git clone $REPO_URL tristaciss
        cd tristaciss
        
        # 设置目录权限
        if [ "$USER" != "root" ]; then
            ${SUDO_CMD} chown -R $USER:$USER /opt/tristaciss
        fi
        
>>>>>>> f678fd0b3612d6e189128bcb6e2b3433fdc32e09
        log_info "项目代码下载完成"
    fi
}

# 部署应用
deploy_application() {
    log_step "部署应用..."
    
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
    echo "  监控面板: ./monitor.sh"
    echo
    echo -e "${BLUE}📁 重要目录：${NC}"
    echo "  项目目录: $(pwd)"
    echo "  日志目录: $(pwd)/logs"
    echo "  数据目录: $(pwd)/data"
    echo
    echo -e "${YELLOW}💡 提示：${NC}"
    echo "  - 首次部署后，请检查环境配置文件"
    echo "  - 建议配置SSL证书以启用HTTPS"
    echo "  - 定期备份数据和配置文件"
}

# 创建管理脚本
create_management_scripts() {
    log_step "创建管理脚本..."
    
    # 创建快速重启脚本
    cat > restart.sh << 'EOF'
#!/bin/bash
echo "重启服务..."
docker-compose restart
echo "服务重启完成"
docker-compose ps
EOF
    
    # 创建快速查看日志脚本
    cat > logs.sh << 'EOF'
#!/bin/bash
echo "选择要查看的日志："
echo "1. 前端日志"
echo "2. 后端日志"
echo "3. 所有日志"
read -p "请选择 (1-3): " choice

case $choice in
    1) docker-compose logs -f frontend ;;
    2) docker-compose logs -f backend ;;
    3) docker-compose logs -f ;;
    *) echo "无效选择" ;;
esac
EOF
    
    # 添加执行权限
    chmod +x restart.sh logs.sh
    
    log_info "管理脚本创建完成"
}

# 主函数
main() {
    show_welcome
    
    # 检查用户权限
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
    
    log_info "开始自动部署流程..."
    
    check_system
    update_system
    install_docker
    install_docker_compose
    setup_firewall
    setup_project
    download_project
    deploy_application
    health_check
    create_management_scripts
    show_result
    
    log_info "🎉 部署流程全部完成！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"
