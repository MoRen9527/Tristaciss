/**
 * 配置管理相关的 TypeScript 类型定义
 */

// 提供商配置接口
export interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  enabledModels: string[];
  openaiCompatible: boolean;
}

// 提供商配置集合
export interface ProviderConfigs {
  [providerKey: string]: ProviderConfig;
}

// 指令类型
export type CommandType = 
  | 'GET_ALL_CONFIGS'
  | 'UPDATE_PROVIDER_CONFIG'
  | 'DELETE_PROVIDER_CONFIG'
  | 'SYNC_CONFIGS';

// 配置指令接口
export interface ConfigCommand {
  type: CommandType;
  requestId: string;
  timestamp: string;
  data?: {
    provider?: string;
    config?: any;
  };
}

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 配置响应数据
export interface ConfigResponseData {
  configs: {
    [providerKey: string]: {
      enabled: boolean;
      api_key: string;
      base_url: string;
      default_model: string;
      enabled_models: string[];
      models?: string[];
      openai_compatible?: boolean;
    };
  };
}

// 模型信息接口
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  displayName: string;
  status?: string;
  enabled?: boolean;
  description?: string; // 添加描述字段
  features?: string[]; // 添加特性字段
  maxTokens?: number; // 添加最大token数
  color?: string; // 添加颜色字段
}

// 提供商显示名称映射
export interface ProviderDisplayNames {
  [key: string]: string;
}

// 事件监听器类型
export type ConfigEventListener = (data: any) => void;

// 事件类型
export type ConfigEventType = 
  | 'configLoaded'
  | 'configUpdated'
  | 'configDeleted'
  | 'configChanged'
  | 'providerConfigUpdated'
  | 'groupChatConfigUpdated';

// 测试连接响应
export interface TestConnectionResponse {
  connected: boolean;
  error?: string;
  development_mode?: boolean;
}

// 配置验证结果
export interface ConfigValidationResult {
  valid: boolean;
  error?: string;
}

// 默认提供商设置
export interface DefaultProviderSettings {
  [providerKey: string]: ProviderConfig;
}

// 模型状态响应
export interface ModelStatusResponse {
  [providerKey: string]: {
    enabled: boolean;
    has_api_key: boolean;
    models: Array<{
      model_id: string;
      status: string;
    }>;
  };
}