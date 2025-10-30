import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 60000, // 增加到60秒，适应AI响应时间
  headers: {
    'Content-Type': 'application/json'
  },
  // 添加凭据支持，允许跨域请求发送cookies
  withCredentials: true
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 处理401错误（未授权）
    if (error.response && error.response.status === 401) {
      // 清除token
      localStorage.removeItem('token');
      
      // 不再自动重定向，让Redux的logout函数处理重定向
      // 这样可以避免在登出时出现循环重定向
    }
    
    // 特殊处理网络错误
    if (!error.response && error.message === 'Network Error') {
      console.warn('网络错误，但可能是CORS预检请求成功而实际请求失败');
      
      // 检查当前页面是否是登录页面
      const isLoginPage = window.location.pathname.includes('login');
      
      // 如果是登录页面，我们不立即拒绝错误，而是让登录组件处理它
      if (isLoginPage) {
        console.log('在登录页面检测到网络错误，将由登录组件处理');
      }
    }
    
    return Promise.reject(error);
  }
);

// Cline AI编程相关API
export const clineAPI = {
  // 代码补全
  complete: (code, prompt) => {
    return api.post('/cline/complete', { code, prompt });
  },
  
  // 代码解释
  explain: (code) => {
    return api.post('/cline/explain', { code });
  }
};

// 聊天相关API
export const chatAPI = {
  // 获取聊天历史
  getHistory: () => {
    return api.get('/chat/history');
  },
  
  // 获取OpenRouter模型列表
  getOpenRouterModels: () => {
    return api.get('/providers/openrouter/models')
      .then(response => {
        console.log('获取到OpenRouter模型列表:', response);
        return response;
      })
      .catch(error => {
        console.error('获取OpenRouter模型列表失败:', error);
        throw error;
      });
  },
  
  // 发送消息
  sendMessage: (messageData) => {
    console.log('📤 API发送消息:', messageData);
    return api.post('/chat/message', messageData);
  },
  
  // 流式发送消息（支持Provider选择和配置）
  sendStreamMessage: async (message: string, onChunk: (data: any) => void, options: { provider?: string; config?: any; model?: string } = {}) => {
    try {
      const { provider, config, model } = options;
      
      // 如果没有配置信息，尝试从localStorage获取
      let providerConfig = config;
      if (!providerConfig && provider) {
        // 首先尝试从provider_settings获取
        const savedSettings = localStorage.getItem('provider_settings');
        if (savedSettings) {
          try {
            const allSettings = JSON.parse(savedSettings);
            const providerSettings = allSettings[provider];
            if (providerSettings && providerSettings.enabled && providerSettings.apiKey) {
              providerConfig = {
                api_key: providerSettings.apiKey,
                base_url: providerSettings.baseUrl,
                default_model: providerSettings.defaultModel,
                enabled: providerSettings.enabled
              };
            }
          } catch (error) {
            console.error('解析provider_settings失败:', error);
          }
        }
        
        // 如果还没有配置，尝试旧的格式
        if (!providerConfig) {
          const savedConfig = localStorage.getItem(`provider_config_${provider}`);
          if (savedConfig) {
            providerConfig = JSON.parse(savedConfig);
          }
        }
      }
      
      if (!providerConfig) {
        throw new Error('缺少provider配置信息，请先在设置中配置provider');
      }

      // 如果传递了具体的model，使用它覆盖默认模型
      if (model && providerConfig) {
        providerConfig.default_model = model;
      }
      
      const rawBase = process.env.REACT_APP_API_URL || '';
      const baseUrl = rawBase.replace(/\/api\/?$/, '');
      const url = `${baseUrl}/api/chat/stream`;
      
      console.log('发送流式请求到:', url);
      console.log('请求配置:', { provider, model, config: providerConfig });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: message,
          provider: provider || 'openrouter',
          config: providerConfig
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        console.log('收到原始数据块:', chunk);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            console.log('解析数据行:', dataStr);
            
            try {
              // 尝试解析JSON
              const data = JSON.parse(dataStr);
              console.log('解析后的数据:', data);
              
              // 处理不同类型的响应
              if (data.type === 'start') {
                console.log('流式响应开始');
              } else if (data.type === 'content' && data.content !== undefined) {
                console.log('接收到内容:', data.content);
                onChunk({content: data.content});
              } else if (data.type === 'end' || data.done) {
                console.log('流式响应结束');
                onChunk({done: true, type: 'end'});
                return;
              } else if (data.type === 'error') {
                console.error('服务器错误:', data.error);
                onChunk({error: data.error});
                return;
              } else if (data.content !== undefined) {
                // 兼容旧格式
                console.log('兼容格式内容:', data.content);
                onChunk({content: data.content});
              }
            } catch (error) {
              console.error('解析JSON失败:', error, '原始数据:', dataStr);
              // 尝试直接使用数据
              if (dataStr && dataStr !== '[DONE]') {
                console.log('使用原始数据作为内容');
                onChunk({content: dataStr});
              } else if (dataStr === '[DONE]') {
                console.log('检测到[DONE]标记');
                onChunk({done: true, type: 'end'});
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('流式请求错误:', error);
      throw error;
    }
  },
  
  // 获取可用的Provider列表
  getAvailableProviders: () => {
    return api.get('/providers');
  },
  
  // 获取可用的模型列表
  getAvailableModels: () => {
    return api.get('/models');
  },
  
  // 测试Provider连接
  testProviderConnection: (providerName) => {
    return api.post('/providers/test', { provider: providerName });
  },

  // 获取模型可用性状态
  getModelsStatus: () => {
    return api.get('/providers/models/status');
  },

  // 获取群聊设置
  getGroupChatSettings: () => {
    return api.get('/chat/group-settings');
  },

  // 保存群聊设置
  saveGroupChatSettings: (settings) => {
    return api.post('/chat/group-settings', settings);
  },

  // 发送群聊消息
  sendGroupChatMessage: async (message, groupSettings, onChunk) => {
    try {
      const rawBase = process.env.REACT_APP_API_URL || '';
      const baseUrl = rawBase.replace(/\/api\/?$/, '');
      const url = `${baseUrl}/api/chat/stream`;
      
      console.log('发送群聊请求到:', url);
      console.log('群聊设置:', groupSettings);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: message,
          chat_mode: 'group',
          group_settings: groupSettings
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        console.log('群聊收到原始数据块:', chunk);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            console.log('群聊解析数据行:', dataStr);
            
            try {
              const data = JSON.parse(dataStr);
              console.log('群聊解析后的数据:', data);
              
              // 处理不同类型的响应
              if (data.type === 'start') {
                console.log('群聊流式响应开始，模式:', data.mode);
              } else if (data.type === 'content' && data.content !== undefined) {
                console.log('群聊接收到内容:', data.content, '来自:', data.provider);
                
                // 触发内容更新事件
                window.dispatchEvent(new CustomEvent('groupChatContent', {
                  detail: {
                    provider: data.provider,
                    aiName: data.aiName || data.ai_name || data.provider,
                    content: data.content,
                    fullContent: data.fullContent || data.content,
                    index: data.index
                  }
                }));
                
                onChunk({
                  content: data.content,
                  provider: data.provider,
                  index: data.index
                });
              } else if (data.type === 'winner') {
                console.log('独占模式获胜者:', data.provider);
                onChunk(data);
              } else if (data.type === 'provider_start') {
                console.log('Provider开始回复:', data.provider);
                
                // 触发Provider开始事件
                window.dispatchEvent(new CustomEvent('groupChatProviderStart', {
                  detail: {
                    provider: data.provider,
                    aiName: data.aiName || data.ai_name || data.provider,
                    index: data.index,
                    total: data.total
                  }
                }));
                
                onChunk(data);
              } else if (data.type === 'provider_end' || data.type === 'groupChatProviderEnd') {
                console.log('🔍 [API Debug] Provider回复完成:', data.provider, '事件类型:', data.type);
                
                // 触发Provider结束事件
                window.dispatchEvent(new CustomEvent('groupChatProviderEnd', {
                  detail: {
                    provider: data.provider,
                    aiName: data.aiName || data.ai_name || data.provider,
                    content: data.content,
                    model: data.model,
                    performance: data.performance,
                    tokens: data.tokens,
                    index: data.index
                  }
                }));
                
                console.log('🔍 [API Debug] 已触发 groupChatProviderEnd 事件');
                onChunk(data);
              } else if (data.type === 'provider_error') {
                console.error('Provider错误:', data.provider, data.error);
                onChunk(data);
              } else if (data.type === 'end' || data.done) {
                console.log('群聊流式响应结束');
                onChunk({done: true, type: 'end'});
                return;
              } else if (data.type === 'error') {
                console.error('群聊服务器错误:', data.error);
                onChunk({error: data.error});
                return;
              }
            } catch (error) {
              console.error('群聊解析JSON失败:', error, '原始数据:', dataStr);
              if (dataStr === '[DONE]') {
                console.log('群聊检测到[DONE]标记');
                onChunk({done: true, type: 'end'});
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('群聊流式请求错误:', error);
      throw error;
    }
  }
};

// 仪表盘相关API
export const dashboardAPI = {
  // 获取系统状态
  getSystemStatus: () => {
    return api.get('/dashboard/system');
  },
  
  // 获取AI状态
  getAIStatus: () => {
    return api.get('/dashboard/ai');
  }
};

// 认证相关API
export const authAPI = {
  // 登录
  login: (credentials) => {
    return api.post('/login', credentials);
  },
  
  // 注册
  register: (userData) => {
    return api.post('/register', userData);
  },
  
  // 获取当前用户信息
  getCurrentUser: () => {
    return api.get('/user');
  },
  
  // 刷新token
  refreshToken: () => {
    return api.post('/refresh');
  },
  
  // 登出
  logout: () => {
    return api.post('/logout');
  }
};

export default api;