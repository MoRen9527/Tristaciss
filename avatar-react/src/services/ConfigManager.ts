/**
 * 配置管理器 - 新架构实现 (TypeScript版本)
 * 采用指令模型，以后端为权威源
 */

import api from './api';
import {
  ProviderConfig,
  ProviderConfigs,
  ConfigCommand,
  ApiResponse,
  ConfigResponseData,
  ModelInfo,
  ProviderDisplayNames,
  ConfigEventListener,
  ConfigEventType,
  TestConnectionResponse,
  ConfigValidationResult,
  DefaultProviderSettings,
  ModelStatusResponse
} from '../types/config';

const ENV_KEY_PLACEHOLDER = '__ENV_CONFIGURED__';

class ConfigManager {
  public cache: Map<string, any>; // 改为 public 以允许外部访问
  private syncInterval: number;
  private listeners: Map<ConfigEventType, ConfigEventListener[]>;
  private requestId: number;

  constructor() {
    this.cache = new Map(); // 本地缓存，非持久化
    this.syncInterval = 30000; // 30秒同步一次
    this.listeners = new Map(); // 事件监听器
    this.requestId = 0;
    
    // 启动定期同步
    this.startPeriodicSync();
  }

  /**
   * 生成请求ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestId}`;
  }

  /**
   * 加载所有配置
   */
  async loadConfigs(): Promise<ProviderConfigs> {
    try {
      // 使用指令模型获取所有配置
      const command: ConfigCommand = {
        type: 'GET_ALL_CONFIGS',
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString()
      };
      
      const response: ApiResponse<ConfigResponseData> = await api.post('/config/command', command);
      
      if (response && response.success && response.data && response.data.configs) {
        // 转换后端格式到前端格式
        const providers: ProviderConfigs = {};
        Object.entries(response.data.configs).forEach(([key, provider]) => {
          console.log(`🔄 ConfigManager处理提供商 ${key}:`, provider);
          const hasApiKey = Boolean(provider.has_api_key || (provider.api_key && provider.api_key !== ENV_KEY_PLACEHOLDER));
          providers[key] = {
            enabled: provider.enabled || false,
            apiKey: provider.api_key && provider.api_key !== ENV_KEY_PLACEHOLDER ? provider.api_key : '',
            hasApiKey,
            apiKeySource: provider.api_key_source || (hasApiKey ? 'env' : 'unset'),
            baseUrl: provider.base_url || '',
            defaultModel: provider.default_model || '',
            enabledModels: provider.enabled_models || provider.models || [],
            openaiCompatible: provider.openai_compatible !== undefined ? provider.openai_compatible : false
          };
          console.log(`🔄 ConfigManager最终${key}配置:`, providers[key]);
        });
        
        this.cache.set('providers', providers);
        this.notifyListeners('configLoaded', providers);
        return providers;
      } else {
        throw new Error(response?.error || '获取配置失败');
      }
    } catch (error: any) {
      console.error('加载配置失败 - 详细错误:', error);
      console.error('错误响应:', error.response);
      console.error('错误状态:', error.response?.status);
      console.error('错误数据:', error.response?.data);
      console.error('请求URL:', error.config?.url);
      
      // 回退到localStorage
      const localConfig = localStorage.getItem('provider_settings');
      if (localConfig) {
        try {
          const parsed: ProviderConfigs = JSON.parse(localConfig);
          this.cache.set('providers', parsed);
          return parsed;
        } catch (parseError) {
          console.error('解析本地配置失败:', parseError);
        }
      }
      
      // 返回默认配置
      return this.getDefaultProviderSettings();
    }
  }

  /**
   * 更新提供商配置
   */
  async updateProviderConfig(providerKey: string, config: ProviderConfig): Promise<{ success: boolean; config: ProviderConfig }> {
    try {
      console.log(`🔧 ConfigManager.updateProviderConfig 被调用:`, { providerKey, config });
      
      const configData = {
        api_key: config.apiKey || '',
        base_url: config.baseUrl || '',
        default_model: config.defaultModel || '',
        enabled: config.enabled || false,
        enabled_models: config.enabledModels || [],
        openai_compatible: config.openaiCompatible || false
      };
      
      console.log(`📦 准备发送的配置数据:`, configData);
      
      // 使用指令模型更新配置
      const command: ConfigCommand = {
        type: 'UPDATE_PROVIDER_CONFIG',
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        data: {
          provider: providerKey,
          config: configData
        }
      };
      
      console.log(`📤 发送指令:`, command);
      const response: ApiResponse = await api.post('/config/command', command);
      console.log(`📥 收到响应:`, response);
      
      if (response && response.success) {
        // 更新本地缓存
        const currentConfigs: ProviderConfigs = this.cache.get('providers') || {};
        currentConfigs[providerKey] = config;
        this.cache.set('providers', currentConfigs);
        
        // 同步更新localStorage作为备份
        localStorage.setItem('provider_settings', JSON.stringify(currentConfigs));
        
        // 通知监听器
        this.notifyListeners('configUpdated', { provider: providerKey, config: config });
        this.notifyListeners('providerConfigUpdated', { provider: providerKey, config: config });
        
        return { success: true, config: config };
      } else {
        throw new Error(response?.error || '更新配置失败');
      }
    } catch (error: any) {
      console.error('更新配置失败:', error);
      throw error;
    }
  }

  /**
   * 删除提供商配置
   */
  async deleteProviderConfig(providerKey: string): Promise<{ success: boolean }> {
    try {
      // 使用指令模型删除配置
      const command: ConfigCommand = {
        type: 'DELETE_PROVIDER_CONFIG',
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        data: {
          provider: providerKey
        }
      };
      
      const response: ApiResponse = await api.post('/config/command', command);
      
      if (response && response.success) {
        // 更新本地缓存
        const currentConfigs: ProviderConfigs = this.cache.get('providers') || {};
        delete currentConfigs[providerKey];
        this.cache.set('providers', currentConfigs);
        
        // 同步更新localStorage
        localStorage.setItem('provider_settings', JSON.stringify(currentConfigs));
        
        // 通知监听器
        this.notifyListeners('configDeleted', { provider: providerKey });
        
        return { success: true };
      } else {
        throw new Error(response?.error || '删除配置失败');
      }
    } catch (error: any) {
      console.error('删除配置失败:', error);
      throw error;
    }
  }

  /**
   * 同步配置
   */
  async syncConfigs(): Promise<ProviderConfigs> {
    try {
      // 直接调用加载配置方法，它会从后端获取最新配置
      const newConfigs = await this.loadConfigs();
      const oldConfigs: ProviderConfigs = this.cache.get('providers') || {};
      
      // 检查是否有变化
      if (this.hasConfigChanged(oldConfigs, newConfigs)) {
        this.cache.set('providers', newConfigs);
        localStorage.setItem('provider_settings', JSON.stringify(newConfigs));
        this.notifyListeners('configChanged', newConfigs);
      }
      
      return newConfigs;
    } catch (error: any) {
      console.warn('同步配置失败:', error);
      // 同步失败时返回缓存的配置
      return this.cache.get('providers') || {};
    }
  }

  /**
   * 检查配置是否有变化
   */
  hasConfigChanged(oldConfigs: ProviderConfigs, newConfigs: ProviderConfigs): boolean {
    return JSON.stringify(oldConfigs) !== JSON.stringify(newConfigs);
  }

  /**
   * 获取默认配置
   */
  getDefaultProviderSettings(): DefaultProviderSettings {
    return {
      openai: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-3.5-turbo',
        enabledModels: ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'],
        openaiCompatible: false
      },
      anthropic: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://api.anthropic.com',
        defaultModel: 'claude-3-sonnet-20240229',
        enabledModels: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
        openaiCompatible: false
      },
      deepseek: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
        enabledModels: ['deepseek-chat', 'deepseek-coder'],
        openaiCompatible: true
      },
      zhipu: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultModel: 'glm-4',
        enabledModels: ['glm-4', 'glm-4-flash', 'glm-3-turbo'],
        openaiCompatible: false
      }
    };
  }

  /**
   * 添加事件监听器
   */
  addEventListener(event: ConfigEventType, callback: ConfigEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(event: ConfigEventType, callback: ConfigEventListener): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 通知监听器
   */
  notifyListeners(event: ConfigEventType, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件监听器执行失败 (${event}):`, error);
        }
      });
    }
    
    // 同时触发window事件，兼容现有代码
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  /**
   * 启动定期同步
   */
  startPeriodicSync(): void {
    // 暂时禁用定期同步，避免在用户编辑时覆盖配置
    // setInterval(async () => {
    //     try {
    //         await this.syncConfigs();
    //     } catch (error) {
    //         console.warn('定期同步失败:', error);
    //     }
    // }, this.syncInterval);
    console.log('定期同步已禁用，避免配置冲突');
  }

  /**
   * 获取缓存的配置
   */
  getCachedConfigs(): ProviderConfigs {
    return this.cache.get('providers') || {};
  }

  /**
   * 测试提供商连接
   */
  async testProviderConnection(providerKey: string, config: ProviderConfig): Promise<TestConnectionResponse> {
    try {
      const configData = {
        api_key: config.apiKey || '',
        base_url: config.baseUrl || '',
        default_model: config.defaultModel || '',
        enabled: config.enabled || false,
        enabled_models: config.enabledModels || [],
        openai_compatible: config.openaiCompatible || false
      };
      
      const response: TestConnectionResponse = await api.post('/providers/test', {
        provider: providerKey,
        config: configData
      });
      
      return response;
    } catch (error: any) {
      console.error('测试连接失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有可用模型
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      console.log('🔍 ConfigManager.getAvailableModels: 开始获取模型列表');
      const response: ApiResponse<ModelStatusResponse> = await api.get('/providers/models/status');
      console.log('🔍 ConfigManager.getAvailableModels: API响应:', response);
      
      if (response && response.success && response.models) {
        const models: ModelInfo[] = [];
        
        Object.entries(response.models).forEach(([modelKey, modelData]: [string, any]) => {
          const providerKey = modelData.provider || modelKey.split(':', 1)[0];
          const modelName = modelData.model || modelKey.split(':').slice(1).join(':');
          console.log(`🔍 处理模型 ${modelKey}:`, modelData);
          models.push({
            id: modelKey,
            name: modelName,
            provider: providerKey,
            displayName: `${this.getProviderDisplayName(providerKey)} - ${modelName}`,
            status: modelData.status,
            enabled: modelData.available !== false
          });
        });
        
        console.log('🔍 ConfigManager.getAvailableModels: 解析的模型列表:', models);
        return models;
      } else {
        console.warn('🔍 ConfigManager.getAvailableModels: API响应格式不正确');
        throw new Error('获取模型列表失败');
      }
    } catch (error: any) {
      console.error('🔍 ConfigManager.getAvailableModels: 获取可用模型失败:', error);
      console.error('🔍 ConfigManager.getAvailableModels: 错误详情:', error.response);
      
      // 回退到基于配置的模型列表
      console.log('🔍 ConfigManager.getAvailableModels: 回退到配置模型列表');
      return this.getModelsFromConfig();
    }
  }

  /**
   * 从配置中获取模型列表（回退方案）
   */
  async getModelsFromConfig(): Promise<ModelInfo[]> {
    try {
      console.log('🔄 ConfigManager.getModelsFromConfig: 使用回退方案获取模型');
      const providerConfigs = await this.loadConfigs();
      console.log('🔄 ConfigManager.getModelsFromConfig: 提供商配置:', providerConfigs);
      const models: ModelInfo[] = [];

      // 预定义的模型列表
      const predefinedModels: { [key: string]: string[] } = {
        deepseek: ['deepseek-chat', 'deepseek-coder'],
        glm: ['glm-4.5', 'glm-4.5-flash', 'glm-4'],
        openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
        openrouter: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat'],
        qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
        moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
      };

      Object.entries(providerConfigs).forEach(([providerKey, config]) => {
        console.log(`🔄 处理提供商 ${providerKey}:`, config);
        if (config.enabled) {
          // 优先使用配置中的模型，否则使用预定义模型
          let availableModels = config.enabledModels || predefinedModels[providerKey] || [config.defaultModel];
          
          // 确保默认模型在列表中
          if (config.defaultModel && !availableModels.includes(config.defaultModel)) {
            availableModels.unshift(config.defaultModel);
          }
          
          console.log(`🔄 ${providerKey} 的可用模型:`, availableModels);
          
          availableModels.forEach(modelName => {
            if (modelName) {
              models.push({
                id: `${providerKey}:${modelName}`,
                name: modelName,
                provider: providerKey,
                displayName: `${this.getProviderDisplayName(providerKey)} - ${modelName}`,
                enabled: true
              });
            }
          });
        }
      });

      console.log('🔄 ConfigManager.getModelsFromConfig: 回退方案模型列表:', models);
      return models;
    } catch (error: any) {
      console.error('🔄 ConfigManager.getModelsFromConfig: 从配置获取模型列表失败:', error);
      return [];
    }
  }

  /**
   * 获取提供商显示名称
   */
  getProviderDisplayName(providerKey: string): string {
    const displayNames: ProviderDisplayNames = {
      deepseek: 'DeepSeek',
      glm: 'GLM',
      qwen: 'Qwen',
      openrouter: 'OpenRouter',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google',
      moonshot: 'Moonshot',
      meta: 'Meta',
      modelscope: 'ModelScope',
      huggingface: 'HuggingFace'
    };
    return displayNames[providerKey] || providerKey;
  }

  /**
   * 验证配置
   */
  validateConfig(config: ProviderConfig): ConfigValidationResult {
    if (!config.apiKey && config.enabled) {
      return { valid: false, error: 'API Key 不能为空' };
    }
    
    if (!config.baseUrl) {
      return { valid: false, error: 'Base URL 不能为空' };
    }
    
    if (!config.defaultModel) {
      return { valid: false, error: '默认模型不能为空' };
    }
    
    return { valid: true };
  }
}

// 创建全局实例
const configManager = new ConfigManager();

export default configManager;