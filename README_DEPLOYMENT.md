# 三元星球城市空间站部署指南

## 🚀 快速部署

### 1. 服务器准备
- 系统：Alibaba Cloud Linux 3.2104 LTS 64位
- 最低配置：2核4G，20G硬盘
- 网络：确保80、443、8008端口开放

### 2. 一键部署
```bash
# 1. 上传项目代码到服务器
# 推荐使用Git克隆或rsync同步
git clone https://github.com/your-username/Tristaciss.git /opt/Tristaciss
# 或使用rsync排除不必要文件
rsync -avz --exclude-from='.deployignore' --delete ./ root@47.245.122.61:/opt/Tristaciss/

# 2. 登录服务器
ssh root@47.245.122.61

# 3. 进入项目目录
cd /opt/Tristaciss

# 4. 给脚本执行权限
chmod +x deploy.sh update.sh monitor.sh

# 5. 执行一键部署
./deploy.sh
```

## 📋 部署架构

```
Internet
    ↓
Nginx (Port 80/443)
    ├── / → React前端 (静态文件)
    ├── /api → FastAPI后端 (Port 8008)
    └── /ws → WebSocket连接
```

## 🔧 管理命令

### 基本操作
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 启动服务
docker-compose up -d
```

### 更新部署
```bash
# 更新项目
./update.sh

# 或手动更新
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 监控管理
```bash
# 运行监控面板
./monitor.sh
```

## 📁 目录结构

```
Tristaciss/
├── api-server/              # 后端代码
├── avatar-react/            # 前端代码
├── Dockerfile.backend       # 后端Docker文件
├── Dockerfile.frontend      # 前端Docker文件
├── docker-compose.yml       # Docker编排文件
├── nginx.conf              # Nginx配置
├── deploy.sh               # 部署脚本
├── update.sh               # 更新脚本
├── monitor.sh              # 监控脚本
├── logs/                   # 日志目录
└── data/                   # 数据目录
```

## 🔐 环境配置

### 后端环境变量 (api-server/.env)
```env
# API配置
API_HOST=0.0.0.0
API_PORT=8008

# 数据库配置
DATABASE_URL=sqlite:///./chat_history.db

# 其他配置...
```

### 前端环境变量 (avatar-react/.env.production)
```env
VITE_API_BASE_URL=/api
VITE_WS_URL=/ws
```

## 🛠️ 故障排除

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查日志
   docker-compose logs backend
   docker-compose logs frontend
   
   # 检查端口占用
   netstat -tlnp | grep -E ':(80|8008)'
   ```

2. **前端无法访问后端**
   ```bash
   # 检查网络连接
   docker network ls
   docker network inspect tristaciss_tristaciss-network
   ```

3. **权限问题**
   ```bash
   # 修复权限
   sudo chown -R $USER:$USER ./logs ./data
   chmod 755 ./logs ./data
   ```

### 性能优化

1. **增加内存限制**
   ```yaml
   # 在docker-compose.yml中添加
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 1G
   ```

2. **启用日志轮转**
   ```yaml
   # 在docker-compose.yml中添加
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

## 🔄 CI/CD集成

### GitHub Actions示例
```yaml
name: Deploy to Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        script: |
          cd /opt/Tristaciss
          git pull origin main
          ./update.sh
```

## 📊 监控和日志

### 日志位置
- Nginx日志: `/var/log/nginx/`
- 应用日志: `./logs/`
- Docker日志: `docker-compose logs`

### 监控指标
- 服务健康状态
- 资源使用情况
- 响应时间
- 错误率

## 🔒 安全建议

1. **防火墙配置**
   ```bash
   # 只开放必要端口
   firewall-cmd --permanent --add-port=80/tcp
   firewall-cmd --permanent --add-port=443/tcp
   firewall-cmd --reload
   ```

2. **SSL证书**
   ```bash
   # 使用Let's Encrypt
   certbot --nginx -d yourdomain.com
   ```

3. **定期更新**
   ```bash
   # 定期更新系统和Docker
   yum update -y
   docker system prune -f
   ```

## 📞 技术支持

如遇问题，请检查：
1. 服务器资源是否充足
2. 网络连接是否正常
3. 环境配置是否正确
4. 日志中的错误信息

联系方式：[您的联系方式]