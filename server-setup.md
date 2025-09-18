# 服务器部署操作指南

## 🚀 快速部署步骤

### 方案一：一键自动部署（推荐）

```bash
# 1. 登录服务器
ssh root@47.245.122.61

# 2. 下载并执行一键部署脚本
curl -fsSL https://raw.githubusercontent.com/MoRen9527/Tristaciss/main/quick-deploy.sh | bash

# 或者手动执行
wget https://raw.githubusercontent.com/MoRen9527/Tristaciss/main/quick-deploy.sh
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### 方案二：手动部署

```bash
# 1. 登录服务器
ssh root@47.245.122.61

# 2. 创建项目目录
mkdir -p /opt/tristaciss
cd /opt/tristaciss

# 3. 上传项目代码（推荐使用Git或rsync）
# 方式A：Git克隆（推荐）
git clone https://github.com/Tristaciss/Tristaciss.git .

# 方式B：使用rsync排除垃圾文件
# 在本地执行：
rsync -avz --exclude-from='.deployignore' --delete ./ root@47.245.122.61:/opt/tristaciss/

# 方式C：手动上传必要文件
scp -r ./api-server ./avatar-react root@47.245.122.61:/opt/tristaciss/
scp ./deploy.sh ./docker-compose.yml ./Dockerfile.* root@47.245.122.61:/opt/tristaciss/

# 4. 执行部署脚本
chmod +x deploy.sh
./deploy.sh
```

## 📋 部署前准备清单

### 服务器要求
- [x] 阿里云ECS实例
- [x] Alibaba Cloud Linux 3.2104 LTS 64位
- [x] 最低配置：2核4G内存，20GB硬盘
- [x] 公网IP：47.245.122.61

### 网络配置
- [x] 安全组开放端口：80, 443, 8008
- [x] 防火墙配置（脚本自动处理）

### 环境文件检查
- [ ] `api-server/.env` - 后端环境配置
- [ ] `avatar-react/.env.production` - 前端生产环境配置

## 🔧 环境配置模板

### 后端环境配置 (api-server/.env)
```env
# 服务配置
API_HOST=0.0.0.0
API_PORT=8008
DEBUG=false

# 数据库配置
DATABASE_URL=sqlite:///./chat_history.db

# API密钥配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# 其他配置
CORS_ORIGINS=["http://47.245.122.61", "https://47.245.122.61"]
```

### 前端环境配置 (avatar-react/.env.production)
```env
# API配置
VITE_API_BASE_URL=/api
VITE_WS_URL=/ws

# 生产环境配置
VITE_NODE_ENV=production
```

## 🚀 部署执行流程

### 自动化部署流程
1. **系统检查** - 检查操作系统、网络、磁盘空间
2. **系统更新** - 更新系统包，安装基础工具
3. **Docker安装** - 安装Docker和Docker Compose
4. **防火墙配置** - 开放必要端口
5. **项目部署** - 构建镜像，启动服务
6. **健康检查** - 验证服务状态
7. **完成配置** - 创建管理脚本

### 预计部署时间
- 全新服务器：15-20分钟
- 已有Docker环境：5-10分钟

## 📊 部署后验证

### 1. 服务状态检查
```bash
# 检查容器状态
docker-compose ps

# 检查服务日志
docker-compose logs -f

# 检查资源使用
docker stats
```

### 2. 功能测试
```bash
# 前端访问测试
curl -I http://47.245.122.61

# 后端API测试
curl http://47.245.122.61/api/health

# WebSocket测试
curl -I http://47.245.122.61/ws
```

### 3. 性能监控
```bash
# 运行监控面板
./monitor.sh

# 查看系统资源
htop
df -h
```

## 🛠️ 常用管理命令

### 服务管理
```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps
```

### 日志管理
```bash
# 查看所有日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 查看最近日志
docker-compose logs --tail=100 backend
```

### 更新部署
```bash
# 快速更新
./update.sh

# 手动更新
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🔒 安全配置

### 1. 防火墙设置
```bash
# 查看防火墙状态
firewall-cmd --state

# 查看开放端口
firewall-cmd --list-ports

# 添加端口（如需要）
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --reload
```

### 2. SSL证书配置（可选）
```bash
# 安装Certbot
yum install -y certbot python3-certbot-nginx

# 申请证书
certbot --nginx -d yourdomain.com

# 自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### 3. 定期备份
```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r /opt/tristaciss/data $BACKUP_DIR/
cp -r /opt/tristaciss/logs $BACKUP_DIR/
cp /opt/tristaciss/docker-compose.yml $BACKUP_DIR/
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR
EOF

chmod +x backup.sh

# 设置定时备份
echo "0 2 * * * /opt/tristaciss/backup.sh" | crontab -
```

## 🚨 故障排除

### 常见问题及解决方案

1. **端口被占用**
   ```bash
   # 查看端口占用
   netstat -tlnp | grep :80
   
   # 停止占用进程
   kill -9 <PID>
   ```

2. **Docker服务异常**
   ```bash
   # 重启Docker服务
   systemctl restart docker
   
   # 检查Docker状态
   systemctl status docker
   ```

3. **容器启动失败**
   ```bash
   # 查看详细错误
   docker-compose logs backend
   
   # 重新构建镜像
   docker-compose build --no-cache backend
   ```

4. **网络连接问题**
   ```bash
   # 检查网络配置
   docker network ls
   docker network inspect tristaciss_tristaciss-network
   ```

### 紧急恢复
```bash
# 快速重置
docker-compose down
docker system prune -f
docker-compose up -d --build
```

## 📞 技术支持

### 监控和告警
- 服务状态监控：`./monitor.sh`
- 日志监控：`./logs.sh`
- 资源监控：`htop`, `iotop`, `nethogs`

### 联系方式
- 技术支持：[您的联系方式]
- 文档地址：[文档链接]
- 问题反馈：[GitHub Issues链接]

---

**注意事项：**
1. 首次部署建议在测试环境验证
2. 生产环境部署前请备份重要数据
3. 定期更新系统和应用程序
4. 监控服务器资源使用情况