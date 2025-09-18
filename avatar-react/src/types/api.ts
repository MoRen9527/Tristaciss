/**
 * API 相关的 TypeScript 类型定义
 */

// 基础 API 响应接口
export interface BaseApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 模型状态响应
export interface ModelsStatusResponse extends BaseApiResponse {
  models: {
    [providerKey: string]: {
      enabled: boolean;
      has_api_key: boolean;
      models: Array<{
        model_id: string;
        status: string;
      }>;
    };
  };
}



// 聊天会话接口
export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

// 聊天消息接口
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  type?: 'normal' | 'error' | 'system';
  timestamp: string;
  provider?: string;
  model?: string;
  aiName?: string;
  performance?: {
    first_token_time?: number;
    response_time?: number;
    tokens_per_second?: number;
  };
  tokens?: {
    input: number;
    output: number;
    total: number;
    cache?: number;
    input_cost?: number;
    output_cost?: number;
    cache_cost?: number;
    total_cost_cny?: number;
  };
  responses?: GroupChatResponse[];
}

// 群聊响应接口
export interface GroupChatResponse {
  id: string;
  provider: string;
  model: string;
  content: string;
  timestamp: string;
  performance?: {
    first_token_time?: number;
    response_time?: number;
    tokens_per_second?: number;
  };
  tokens?: {
    input: number;
    output: number;
    total: number;
    cache?: number;
    input_cost?: number;
    output_cost?: number;
    cache_cost?: number;
    total_cost_cny?: number;
  };
}