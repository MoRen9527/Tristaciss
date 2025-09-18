# OpenRouter 双模式支持实施方案

## 背景分析

根据对OpenRouter文档的研究，确认了以下关键信息：

### 1. OpenRouter API兼容性确认
- ✅ **OpenAI兼容模式**：OpenRouter提供完全兼容OpenAI SDK的API接口
- ✅ **官方SDK支持**：OpenRouter有自己的官方SDK和AI SDK Provider
- ✅ **免费模型支持**：大量免费模型可通过两种模式访问

### 2. 免费模型列表（已确认）
基于文档分析，以下免费模型可用：
- `deepseek/deepseek-r1:free` - DeepSeek R1 (Free)
- `deepseek/deepseek-r1-0528:free` - DeepSeek R1 0528 (Free)  
- `qwen/qwen3-8b:free` - Qwen3 8B (Free)
- `qwen/qwen3-30b-a3b:free` - Qwen3 30B A3B (Free)
- `qwen/qwen3-235b-a22b:free` - Qwen3 235B A22B (Free)
- `qwen/qwq-32b:free` - Qwen QwQ 32B (Free)
- `cognitivecomputations/dolphin3.0-mistral-24b:free` - Dolphin3.0 Mistral 24B (Free)
- `mistralai/devstral-small-2505:free` - Mistral Devstral Small 2505 (Free)
- `google/gemma-3n-e4b-it:free` - Google Gemma 3n 4B (Free)

## 实施方案

### 阶段1：扩展现有OpenRouter Provider

#### 1.1 增强配置支持
```json
{
  "openrouter": {
    "api_key": "sk-or-v1-xxx",
    "base_url": "https://openrouter.ai/api/v1",
    "default_model": "deepseek/deepseek-r1:free",
    "enabled": true,
    "openai_compatible": true,
    "use_official_sdk": false,  // 新增：是否使用官方SDK
    "enabled_models": [
      "deepseek/deepseek-r1:free",
      "qwen/qwen3-8b:free",
      "qwen/qwen3-30b-a3b:free"
    ],
    "free_models_only": true,   // 新增：仅启用免费模型
    "updated_at": "2025-09-07T22:24:17.856594"
  }
}
```

#### 1.2 创建OpenRouter官方SDK Provider
创建新文件：`api-server/providers/openrouter_official.py`

#### 1.3 修改Provider Manager
支持同一提供商的多种实现模式

### 阶段2：前端配置界面增强

#### 2.1 OpenRouter配置面板
- 模式选择：OpenAI兼容 vs 官方SDK
- 免费模型筛选开关
- 多模型选择支持
- 实时可用性检测

#### 2.2 模型选择器增强
- 按提供商分组显示
- 免费模型标识
- 批量选择支持

### 阶段3：多模型并发支持

#### 3.1 群聊多模型配置
- 支持同时启用多个OpenRouter免费模型
- 负载均衡和故障转移
- 成本优化策略

#### 3.2 单聊模型切换
- 动态模型选择
- 会话内模型切换
- 模型性能监控

## 技术实现细节

### 1. Provider架构设计

```python
# 基础OpenRouter Provider (OpenAI兼容模式)
class OpenRouterProvider(BaseModelProvider):
    def __init__(self, config: ProviderConfig):
        self.mode = "openai_compatible"
        # 现有实现保持不变

# 新增：OpenRouter官方SDK Provider
class OpenRouterOfficialProvider(BaseModelProvider):
    def __init__(self, config: ProviderConfig):
        self.mode = "official_sdk"
        # 使用OpenRouter官方SDK实现

# Provider工厂
class OpenRouterProviderFactory:
    @staticmethod
    def create_provider(config: ProviderConfig) -> BaseModelProvider:
        if config.use_official_sdk:
            return OpenRouterOfficialProvider(config)
        else:
            return OpenRouterProvider(config)
```

### 2. 免费模型管理

```python
class FreeModelManager:
    FREE_MODELS = {
        "deepseek/deepseek-r1:free": {
            "name": "DeepSeek R1 (Free)",
            "context_length": 163840,
            "supports_reasoning": True
        },
        "qwen/qwen3-8b:free": {
            "name": "Qwen3 8B (Free)", 
            "context_length": 40960,
            "supports_reasoning": True
        },
        # ... 其他免费模型
    }
    
    @classmethod
    def get_free_models(cls) -> List[ModelInfo]:
        return [self._create_model_info(model_id, info) 
                for model_id, info in cls.FREE_MODELS.items()]
```

### 3. 多模型路由策略

```python
class MultiModelRouter:
    def __init__(self, enabled_models: List[str]):
        self.enabled_models = enabled_models
        self.current_index = 0
    
    async def route_request(self, messages: List[Dict], **kwargs):
        for attempt in range(len(self.enabled_models)):
            model = self.enabled_models[self.current_index]
            try:
                async for chunk in self._make_request(model, messages, **kwargs):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"模型 {model} 请求失败: {e}")
                self.current_index = (self.current_index + 1) % len(self.enabled_models)
        
        raise ProviderError("所有模型都不可用")
```

## 配置文件更新

### provider_configs.json 结构调整

```json
{
  "providers": {
    "openrouter_compatible": {
      "api_key": "",
      "base_url": "https://openrouter.ai/api/v1", 
      "default_model": "deepseek/deepseek-r1:free",
      "enabled": false,
      "openai_compatible": true,
      "provider_mode": "openai_compatible",
      "enabled_models": []
    },
    "openrouter_official": {
      "api_key": "",
      "base_url": "https://openrouter.ai/api/v1",
      "default_model": "deepseek/deepseek-r1:free", 
      "enabled": false,
      "openai_compatible": false,
      "provider_mode": "official_sdk",
      "enabled_models": []
    }
  }
}
```

## 前端界面设计

### 1. OpenRouter配置面板
```typescript
interface OpenRouterConfig {
  apiKey: string;
  mode: 'openai_compatible' | 'official_sdk';
  freeModelsOnly: boolean;
  enabledModels: string[];
  loadBalancing: boolean;
}

const OpenRouterConfigPanel: React.FC = () => {
  // 模式选择
  // 免费模型筛选
  // 多模型选择
  // 高级设置
};
```

### 2. 模型选择器增强
```typescript
interface ModelGroup {
  provider: string;
  models: ModelInfo[];
  freeModels: ModelInfo[];
}

const EnhancedModelSelector: React.FC = () => {
  // 按提供商分组
  // 免费模型标识
  // 批量选择
  // 实时状态检测
};
```

## 实施时间线

### 第1周：后端基础架构
- [ ] 创建OpenRouterOfficialProvider
- [ ] 修改ProviderManager支持多模式
- [ ] 实现免费模型管理器
- [ ] 更新配置文件结构

### 第2周：API接口调整
- [ ] 扩展配置API支持新字段
- [ ] 实现多模型路由逻辑
- [ ] 添加模型可用性检测
- [ ] 完善错误处理和日志

### 第3周：前端界面开发
- [ ] 设计OpenRouter配置面板
- [ ] 实现模式切换功能
- [ ] 开发多模型选择器
- [ ] 添加实时状态显示

### 第4周：测试和优化
- [ ] 功能测试和调试
- [ ] 性能优化
- [ ] 文档更新
- [ ] 用户体验优化

## 预期效果

### 1. 成本优化
- 通过免费模型降低API调用成本
- 多模型负载均衡提高可用性
- 智能路由减少失败重试

### 2. 功能增强
- 支持更多模型选择
- 提供官方SDK和兼容模式双重保障
- 灵活的配置选项

### 3. 用户体验
- 简化配置流程
- 直观的模型管理界面
- 实时状态反馈

## 风险评估

### 技术风险
- **中等**：官方SDK集成复杂度
- **低**：现有架构兼容性
- **低**：免费模型稳定性

### 解决方案
- 渐进式实施，保持向后兼容
- 充分测试两种模式
- 实现优雅降级机制

## 总结

本方案通过扩展现有OpenRouter Provider，支持OpenAI兼容和官方SDK双模式，同时重点支持免费模型的多选和负载均衡，既能降低成本又能提高系统可用性和灵活性。