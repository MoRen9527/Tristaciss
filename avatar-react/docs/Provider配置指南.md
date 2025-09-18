# Provider配置指南

## 🏗️ 架构概述

本系统采用多Provider架构，支持同一个AI模型通过不同API路径访问，提供更好的灵活性和可用性。

```
┌─────────────────────────────────────────┐
│              FastAPI Layer              │
│         /api/stream?provider=xxx        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Provider Manager             │
│     • Route requests                    │
│     • Load configurations               │
│     • Handle model mapping              │
└─────────────┬─────────────┬─────────────┘
              │             │
    ┌─────────▼───────┐   ┌─▼──────────────┐
    │ OpenRouter      │   │ OpenAI         │
    │ Provider        │   │ Provider       │
    │ • deepseek/     │   │ • deepseek-    │
    │   deepseek-r1   │   │   chat         │
    └─────────────────┘   └────────────────┘
```

## 🔄 DeepSeek模型的两种访问方式

### 方式1：通过OpenRouter (推荐新手)
- **Provider**: OpenRouter
- **模型名称**: `deepseek/deepseek-r1-0528:free`
- **优势**: 免费使用、配置简单
- **适用**: 测试和轻度使用

### 方式2：通过DeepSeek官方API (推荐生产)
- **Provider**: OpenAI兼容API
- **模型名称**: `deepseek-chat`
- **Base URL**: `https://api.deepseek.com/v1`
- **优势**: 速度快、稳定性高
- **适用**: 生产环境

## 🚀 快速开始

### 1. 前端UI配置 (推荐)

1. 启动应用后，点击聊天界面右上角的⚙️设置图标
2. 选择"配置指南"标签页查看详细说明
3. 根据需要选择OpenRouter或DeepSeek直连
4. 填写API配置并测试连接
5. 保存设置

### 2. 后端环境变量配置

在 `api-server` 目录下创建 `.env` 文件：

```bash
# OpenRouter配置
OPENROUTER_API_KEY=sk-or-v1-xxx...

# DeepSeek配置 (通过OpenAI兼容接口)
OPENAI_API_KEY=sk-fe34348dced24f3da9dfcc38bcdf7734
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_DEFAULT_MODEL=deepseek-chat
```

## 📋 Provider对比

| Provider | 模型 | 费用 | 速度 | 配置难度 | 推荐场景 |
|----------|------|------|------|----------|----------|
| OpenRouter | `deepseek/deepseek-r1-0528:free` | 免费 | 中等 | 简单 | 测试、学习 |
| DeepSeek直连 | `deepseek-chat` | 按量付费 | 快速 | 中等 | 生产、高频使用 |

## 🛠️ 配置步骤详解

### OpenRouter配置
1. 注册 [OpenRouter](https://openrouter.ai) 账户
2. 获取API密钥
3. 在前端设置中填写：
   - API Key: `sk-or-v1-xxx...`
   - Base URL: `https://openrouter.ai/api/v1` (默认)
   - 默认模型: `deepseek/deepseek-r1-0528:free`

### DeepSeek直连配置
1. 注册 [DeepSeek](https://deepseek.com) 账户
2. 完成实名认证并充值
3. 获取API密钥
4. 在前端设置中填写：
   - API Key: `sk-xxx...`
   - Base URL: `https://api.deepseek.com/v1`
   - 默认模型: `deepseek-chat`

## 🔧 故障排除

### Provider显示"离线"状态
1. 检查API密钥是否正确
2. 确认Base URL设置无误
3. 验证网络连接
4. 查看浏览器控制台错误信息

### 测试连接失败
- **401错误**: API密钥无效或过期
- **网络错误**: 检查后端服务是否启动
- **超时**: 网络连接不稳定

### 模型调用失败
- 确认选择的模型在对应Provider中可用
- 检查API配额是否充足
- 验证模型名称拼写正确

## 📚 API文档参考

- [OpenRouter API文档](https://openrouter.ai/docs)
- [DeepSeek API文档](https://platform.deepseek.com/api-docs)
- [OpenAI API文档](https://platform.openai.com/docs/api-reference)

## 🔄 更新日志

- **Phase 1**: 实现多Provider架构和API代理层
- **Phase 2**: 完成前端Provider选择器和配置界面
- **当前版本**: 支持OpenRouter和DeepSeek双路径访问

---

*最后更新: 2025年1月26日*