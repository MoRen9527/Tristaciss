# 🌟 Tristaciss - 三元宇宙-星球城市空间站

AI应用生产制造平台 - 基于FastAPI + React的前后端分离架构

## 🏗️ 项目架构

```
Tristaciss/
├── api-server/              # FastAPI后端
│   ├── providers/          # AI服务提供商
│   └── start_server.py    # 启动脚本
├── avatar-react/           # React前端
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API服务
│   │   └── store/        # 状态管理
└── docs/                  # 项目文档
```

## 🚀 快速开始

### 后端启动
```bash
cd api-server
.\.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac
python start_server.py
```

### 前端启动
```bash
cd avatar-react
npm install
npm run dev
```

## 🐳 Docker部署

```bash
# 安全部署（推荐）
./deploy-safe.sh

# 或使用Git克隆部署
git clone https://github.com/MoRen9527/Tristaciss.git
cd Tristaciss
./deploy.sh
```

## 📚 文档

- [部署指南](./三元项目部署方案总结.md)
- [服务器配置](./server-setup.md)
- [详细部署文档](./README_DEPLOYMENT.md)

## 🛠️ 技术栈

- **后端**: FastAPI, Python, SQLite
- **前端**: React, Material-UI, TypeScript
- **部署**: Docker, Nginx, Docker Compose

## 📄 许可证

MIT License
