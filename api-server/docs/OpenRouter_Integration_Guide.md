# OpenRouter 双模式集成指南

## 概述

本指南说明如何在现有项目架构中使用OpenRouter的双模式支持，包括OpenAI兼容模式和官方SDK模式，特别是对免费模型的支持。

## 核心设计原则

### 1. 保持现有架构
- **不破坏现有代码**：所有修改都是在现有架构基础上的扩展
- **统一双模式逻辑**：OpenRouter遵循项目统一的OpenAI兼容/官方SDK双模式架构
- **最小化改动**：只在必要的地方添加功能，不重构稳定代码

### 2. 免费模型识别
- **通用规则**：包含`:free`后缀的模型自动识别为免费模型
- **提供商特定**：每个提供商可以定义自己的免费模型列表
- **能力推断**：基于模型名称推断基本能力（推理、视觉、编程等）

## 实施的功能

### 1. 前端配置增强

#### ProviderSettings.tsx 更新
```typescript
// 新增的OpenRouter免费模型
openrouter: {
  enabledModels: [
    // 免费推理模型
    'deepseek/deepseek-r1:free',
    'deepseek/deepseek-r1-0528:free',
    'qwen/qwq-32b:free',
    // 免费通用模型  
    'qwen/qwen3-8b:free',
    'qwen/qwen3-30b-a3b:free',
    // 免费编程模型
    'cognitivecomputations/dolphin3.0-mistral-24b:free',
    'mistralai/devstral-small-2505:free',
    // 付费模型（可选）
    'openai/gpt-4o', 'anthropic/claude-3-5-sonnet'
  ]
}
```

#### 模型描述增强
- 🆓 标识免费模型
- 💰 标识付费模型
- 详细的能力描述（推理、编程、多模态等）

### 2. 后端Provider增强

#### OpenRouterProvider 新功能
```python
class OpenRouterProvider(BaseModelProvider):
    # 免费模型列表
    FREE_MODELS = {
        'deepseek/deepseek-r1:free',
        'qwen/qwen3-8b:free',
        # ... 更多免费模型
    }
    
    def is_free_model(self, model_id: str) -> bool:
        """检查模型是否为免费模型"""
        return model_id in self.FREE_MODELS
    
    def get_free_models(self) -> List[str]:
        """获取所有免费模型列表"""
        return list(self.FREE_MODELS)
```

#### ProviderManager 集成
```python
def is_free_model(self, model_id: str) -> bool:
    """通用免费模型检查"""
    # 通用规则：包含 :free 后缀
    if ':free' in model_id:
        return True
    
    # 检查各提供商的免费模型定义
    for provider in self._providers.values():
        if hasattr(provider, 'is_free_model'):
            if provider.is_free_model(model_id):
                return True
    return False
```

### 3. API增强

#### 配置API更新
```python
@router.get("/providers")
async def get_providers():
    """获取提供商配置，包含免费模型信息"""
    providers = load_config().get("providers", {})
    
    # 为每个提供商添加免费模型信息
    for provider_name, provider_info in providers.items():
        if 'models' in provider_info:
            free_models = [
                model for model in provider_info['models'] 
                if ':free' in model
            ]
            provider_info['free_models'] = free_models
    
    return providers
```

## 使用方法

### 1. 配置OpenRouter

在前端设置界面中：
1. 启用OpenRouter提供商
2. 输入API Key
3. 选择需要的模型（免费模型用🆓标识）
4. 保持OpenAI兼容模式开启（默认）

### 2. 使用免费模型

#### 单聊场景
- 选择任意免费模型进行对话
- 系统自动识别免费模型，降低成本

#### 群聊场景  
- 可以勾选多个免费模型
- 系统会在多个模型间负载均衡
- 提高可用性，降低成本

### 3. 模型选择建议

#### 推理任务
- `deepseek/deepseek-r1:free` - 最强推理能力
- `qwen/qwq-32b:free` - 专业推理模型

#### 编程任务
- `mistralai/devstral-small-2505:free` - 软件工程优化
- `cognitivecomputations/dolphin3.0-mistral-24b:free` - 编程数学

#### 通用对话
- `qwen/qwen3-8b:free` - 快速响应
- `qwen/qwen3-235b-a22b:free` - 顶级能力

## 技术架构

### 双模式支持
```
用户请求 → Provider Manager → 模式判断
                              ├─ OpenAI兼容模式 → OpenAI SDK调用
                              └─ 官方SDK模式 → 原生API调用
```

### 免费模型识别
```
模型ID → 通用规则检查(:free后缀) → 提供商特定检查 → 返回是否免费
```

### 能力推断
```
模型ID → 名称分析 → 能力标签(推理/视觉/编程) → 返回能力信息
```

## 测试验证

运行集成测试：
```bash
cd api-server
python test_openrouter_integration.py
```

测试内容：
- 免费模型识别
- Provider Manager集成
- OpenAI兼容模式
- 连接测试
- 配置验证

## 优势总结

1. **成本优化** - 专注免费模型，大幅降低使用成本
2. **无缝集成** - 完全兼容现有架构，无需重构
3. **灵活配置** - 支持免费和付费模型混合使用
4. **高可用性** - 多模型支持，提高服务稳定性
5. **易于扩展** - 标准化的免费模型识别机制

## 注意事项

1. **API限制** - 免费模型可能有使用限制，注意监控
2. **模型更新** - OpenRouter免费模型列表可能变化，需要定期更新
3. **性能差异** - 不同免费模型性能差异较大，根据场景选择
4. **兼容性** - 确保所选模型支持所需功能（流式输出、函数调用等）

通过这个集成方案，您可以在保持现有架构稳定的前提下，充分利用OpenRouter的免费模型资源，实现成本优化和功能扩展的双重目标。