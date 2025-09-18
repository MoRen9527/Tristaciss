// 聊天相关的特定类型定义

import { ChatMessage } from './index';

// 简化的消息类型，用于创建新消息
export interface SimpleChatMessage {
  content: string;
  role: 'user' | 'assistant' | 'system';
  model?: string;
  provider?: string;
}

// 消息创建工厂函数
export const createChatMessage = (simple: SimpleChatMessage): ChatMessage => ({
  id: crypto.randomUUID(),
  timestamp: Date.now(),
  type: 'message',
  thinking: false,
  streaming: false,
  performance: {
    first_token_time: 0,
    response_time: 0,
    tokens_per_second: 0
  },
  tokens: {
    input: 0,
    output: 0,
    total: 0,
    cache: 0,
    input_cost: 0.0000,
    output_cost: 0.0000,
    cache_cost: 0.0000,
    total_cost_cny: 0.0000
  },
  ...simple
});

// 流式消息类型
export interface StreamingMessage extends Partial<ChatMessage> {
  content: string;
  streaming: true;
}

// 消息更新类型
export interface MessageUpdate {
  id: string;
  content?: string;
  streaming?: boolean;
  thinking?: boolean;
  performance?: Partial<ChatMessage['performance']>;
  tokens?: Partial<ChatMessage['tokens']>;
}