// 全局类型定义

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 认证相关类型
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginSuccess: boolean;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 群聊响应类型
export interface GroupChatResponse {
  provider: string;
  aiName: string;
  content: string;
  index?: number;
  isComplete?: boolean;
  model?: string;
  timestamp?: string;
  performance?: {
    first_token_time: number;
    response_time: number;
    tokens_per_second: number;
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

// 聊天相关类型
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  type: string;
  timestamp: number | string;
  thinking: boolean;
  streaming: boolean;
  performance: {
    first_token_time: number;
    response_time: number;
    tokens_per_second: number;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
    cache?: number;
    input_cost?: number;
    output_cost?: number;
    cache_cost?: number;
    total_cost_cny?: number;
  };
  model?: string;
  provider?: string;
  aiName?: string;
  // 群聊相关属性
  responses?: GroupChatResponse[];
  group_chat?: boolean;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  provider?: string;
}

// 模型提供商类型
export interface ModelProvider {
  id: string;
  name: string;
  displayName: string;
  apiKey?: string;
  baseUrl?: string;
  models: ModelInfo[];
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  maxTokens?: number;
  supportsFunctions?: boolean;
  pricing?: {
    input: number;
    output: number;
  };
}

// 配置相关类型
export interface AppConfig {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  defaultProvider: string;
  defaultModel: string;
  maxHistoryLength: number;
  autoSave: boolean;
}

// 仪表板相关类型
export interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon?: string;
  color?: string;
  action?: () => void;
  href?: string;
}

export interface DynamicCard {
  id: string;
  type: string;
  title: string;
  content: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  visible: boolean;
  config?: Record<string, any>;
}

// Redux相关类型
export interface RootState {
  auth: AuthState;
  chat: ChatState;
  dashboard: DashboardState;
  dynamicCards: DynamicCardsState;
  providers: ProvidersState;
}

export interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  messages: ChatMessage[]; // 使用ChatMessage类型
  isLoading: boolean;
  loading: boolean; // 添加loading属性以兼容现有代码
  error: string | null;
  currentProvider: string;
  currentModel: string;
  chatMode: 'single' | 'group';
  groupChatSettings?: any; // 添加群聊设置
}

export interface DashboardState {
  cards: DashboardCard[];
  isLoading: boolean;
  error: string | null;
}

export interface DynamicCardsState {
  cards: DynamicCard[];
  selectedCard: string | null;
  isEditing: boolean;
  isLoading: boolean;
  error: string | null;
  keywordDetection: boolean;
  maxCards: number;
}

export interface ProvidersState {
  providers: ModelProvider[];
  currentProvider: string | null;
  isLoading: boolean;
  error: string | null;
}

// 组件Props类型
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

// 事件处理器类型
export type EventHandler<T = any> = (event: T) => void;
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

// 工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;