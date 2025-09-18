# 阿里云Linux普通用户部署指南

## 创建普通用户并配置sudo权限

### 1. 使用root用户创建普通用户

```bash
# 登录root用户
su -

# 创建用户tristaciss
useradd -m -s /bin/bash tristaciss

# 设置密码
passwd tristaciss
```

### 2. 将用户添加到wheel组（获得sudo权限）

```bash
# 将用户添加到wheel组
usermod -aG wheel tristaciss

# 验证用户组
groups tristaciss
```

### 3. 配置sudo免密（可选）

```bash
# 编辑sudoers文件
visudo

# 添加以下行（可选，允许免密sudo）
tristaciss ALL=(ALL) NOPASSWD:ALL
```

### 4. 切换到普通用户

```bash
# 切换用户
su - tristaciss

# 验证sudo权限
sudo whoami
```

## 使用普通用户部署

### 方法一：一键部署

```bash
# 使用tristaciss用户运行
curl -fsSL https://raw.githubusercontent.com/MoRen9527/Tristaciss/main/quick-deploy.sh | bash
```

### 方法二：本地部署

```bash
# 克隆项目
git clone https://github.com/MoRen9527/Tristaciss.git
cd Tristaciss

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

## 脚本自动检测逻辑

我们的部署脚本会自动检测用户权限：

```bash
# 检查用户权限
if [[ $EUID -eq 0 ]]; then
    # root用户
    SUDO_CMD=""
else
    # 普通用户，检查sudo权限
    if sudo -n true 2>/dev/null; then
        SUDO_CMD="sudo"
    else
        echo "错误：当前用户没有sudo权限"
        exit 1
    fi
fi
```

## 常见问题解决

### Q1: 用户没有sudo权限
```bash
# 解决方法：
su -                           # 切换到root
usermod -aG wheel tristaciss   # 添加到wheel组
su - tristaciss               # 重新登录用户
```

### Q2: Docker权限问题
```bash
# 脚本会自动将用户添加到docker组
sudo usermod -aG docker $USER

# 需要重新登录才能生效
exit
su - tristaciss
```

### Q3: 防火墙配置失败
```bash
# 检查防火墙状态
sudo systemctl status firewalld

# 手动开放端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8008/tcp
sudo firewall-cmd --reload
```

## 安全最佳实践

### 1. 使用普通用户
- ✅ 创建专用用户tristaciss
- ✅ 避免直接使用root用户
- ✅ 配置适当的sudo权限

### 2. 权限管理
```bash
# 检查用户权限
id tristaciss

# 检查sudo权限
sudo -l

# 检查docker组
groups tristaciss
```

### 3. 服务管理
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart
```

## 部署验证

### 1. 检查服务状态
```bash
# 检查容器运行状态
docker ps

# 检查端口监听
netstat -tlnp | grep -E '80|443|8008'
```

### 2. 访问测试
```bash
# 本地测试
curl http://localhost/health
curl http://localhost/api/health

# 外网访问
curl http://YOUR_SERVER_IP/health
```

### 3. 日志检查
```bash
# 查看部署日志
docker-compose logs backend
docker-compose logs frontend
```

## 故障排除

### 权限问题
```bash
# 检查文件权限
ls -la /opt/tristaciss

# 修复权限
sudo chown -R tristaciss:tristaciss /opt/tristaciss
```

### 网络问题
```bash
# 检查防火墙
sudo firewall-cmd --list-all

# 检查端口占用
sudo netstat -tlnp | grep -E '80|443|8008'
```

### Docker问题
```bash
# 检查Docker服务
sudo systemctl status docker

# 重启Docker
sudo systemctl restart docker

# 检查Docker权限
docker ps
```

这样配置后，您就可以安全地使用普通用户tristaciss来部署项目了！