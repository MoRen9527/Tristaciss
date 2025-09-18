# Vite ESM 迁移指南

## 问题描述
Vite的CJS Node API已被弃用，需要迁移到ESM模式。

## 迁移步骤

### 1. 更新 package.json ✅
已添加 `"type": "module"` 到 package.json

### 2. 环境变量迁移
确保所有环境变量使用 `VITE_` 前缀，并通过 `import.meta.env` 访问：

```javascript
// ❌ 旧方式
const apiUrl = process.env.REACT_APP_API_URL

// ✅ 新方式  
const apiUrl = import.meta.env.VITE_API_URL
```

### 3. 配置文件检查
- vite.config.js ✅ 已使用ESM语法
- vitest.config.js ✅ 已使用ESM语法

### 4. 构建和运行
```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 预览构建
npm run preview
```

## 验证迁移成功

运行以下命令验证迁移：
```bash
npm run dev
```

如果没有CJS弃用警告，说明迁移成功。

## 常见问题

### Q: 仍然看到CJS弃用警告？
A: 检查是否有第三方包仍在使用CJS方式导入Vite

### Q: 环境变量不生效？
A: 确保使用 `VITE_` 前缀并通过 `import.meta.env` 访问

### Q: 构建失败？
A: 检查所有导入语句是否使用ESM语法