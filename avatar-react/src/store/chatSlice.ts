import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { chatAPI } from '../services/api';
import { ChatMessage } from '../types';


// 异步操作：获取聊天历史
export const fetchChatHistory = createAsyncThunk(
  'chat/fetchChatHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await chatAPI.getHistory();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 异步操作：发送消息
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (message: any, { rejectWithValue, dispatch }) => {
    try {
      // 根据聊天模式选择不同的API
      if (message.chatMode === 'group') {
        // 群聊模式：使用群聊API
        console.log('🔄 使用群聊模式发送消息:', message);
        
        // 创建一个Promise来处理流式响应
        return new Promise<string>((resolve, reject) => {
          let responses = [];
          let currentProvider = '';
          let currentResponse = '';
          let currentAiName = '';
          let providerIndex = 0;
          let totalProviders = 0;
          let groupChatMessageId = '';
          
          chatAPI.sendGroupChatMessage(
            message.content,
            message.groupSettings,
            (chunk) => {
              console.log('📥 群聊响应块:', chunk);
              
              if (chunk.error) {
                reject(new Error(chunk.error));
                return;
              }
              
              // 处理思考状态
              if (chunk.type === 'provider_thinking') {
                currentProvider = chunk.provider;
                currentAiName = chunk.ai_name;
                providerIndex = chunk.index || 0;
                totalProviders = chunk.total || 1;
                
                // 发送思考状态更新
                window.dispatchEvent(new CustomEvent('groupChatThinking', {
                  detail: {
                    provider: currentProvider,
                    aiName: currentAiName,
                    index: providerIndex,
                    total: totalProviders
                  }
                }));
              } else if (chunk.type === 'provider_start') {
                // 新的provider开始回复
                currentProvider = chunk.provider || chunk.ai_name;
                currentAiName = chunk.ai_name || currentProvider;
                currentResponse = '';
                
                // 如果是第一个provider，立即创建群聊容器消息（Redux）
                if (!groupChatMessageId) {
                  groupChatMessageId = Date.now().toString();
                  // 直接通过 dispatch 创建容器消息，避免丢失
                  (dispatch as any)({ type: 'chat/createGroupContainerMessage', payload: { id: groupChatMessageId } });
                }
                
                // 发送开始回复事件
                window.dispatchEvent(new CustomEvent('groupChatProviderStart', {
                  detail: {
                    provider: currentProvider,
                    aiName: currentAiName,
                    index: chunk.index || 0,
                    total: chunk.total || 1
                  }
                }));
              } else if (chunk.content) {
                currentResponse += chunk.content;
                
                // 发送内容更新事件（用于实时显示）
                window.dispatchEvent(new CustomEvent('groupChatContent', {
                  detail: {
                    provider: currentProvider,
                    aiName: currentAiName,
                    content: chunk.content,
                    fullContent: currentResponse
                  }
                }));
              } else if (chunk.type === 'provider_end' || chunk.type === 'groupChatProviderEnd') {
                // 当前provider回复结束
                console.log('🔍 [ChatSlice Debug] 收到 provider_end 事件:', chunk);
                
                if (currentProvider && currentResponse) {
                  responses.push({
                    provider: currentProvider,
                    aiName: currentAiName,
                    content: currentResponse.trim()
                  });
                  
                  // 直接把该 provider 的完整结果 append 到容器
                  (dispatch as any)({ 
                    type: 'chat/appendGroupResponse', 
                    payload: { 
                      containerId: groupChatMessageId,
                      item: {
                        provider: chunk.provider || currentProvider,
                        aiName: chunk.aiName || currentAiName,
                        content: chunk.content || currentResponse.trim(),
                        model: chunk.model,
                        performance: chunk.performance,
                        tokens: chunk.tokens,
                        index: chunk.index
                      }
                    }
                  });
                }
              } else if (chunk.done || chunk.type === 'end') {
                // 所有回复结束
                if (currentProvider && currentResponse && !responses.find(r => r.provider === currentProvider)) {
                  responses.push({
                    provider: currentProvider,
                    aiName: currentAiName,
                    content: currentResponse.trim()
                  });
                }
                
                // 发送群聊完成事件
                window.dispatchEvent(new CustomEvent('groupChatComplete', {
                  detail: {
                    messageId: groupChatMessageId,
                    responses: responses,
                    totalCount: responses.length
                  }
                }));
                
                resolve('群聊讨论完成');
              }
            }
          ).catch(reject);
        });
      } else {
        // 单聊模式：使用原有API
        console.log('🔄 使用单聊模式发送消息:', message);
        const response = await chatAPI.sendMessage({
          message: message.content,
          provider: message.provider,
          model: message.model
        });
        return response;
      }
    } catch (error: any) {
      console.error('❌ 发送消息失败:', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 异步操作：获取可用的Provider列表
export const fetchAvailableProviders = createAsyncThunk(
  'chat/fetchAvailableProviders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await chatAPI.getAvailableProviders();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 初始状态
const initialState = {
  messages: [
    {
      id: '1',
      content: '"欢迎来到三元宇宙空间站！"',
      role: 'assistant',
      type: 'digitalAvatar',
      timestamp: Date.now(),
      thinking: false,
      streaming: false,
      performance: {
        first_token_time: 0.000,
        response_time: 0.000,
        tokens_per_second: 0.0
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
      provider: 'system',
      model: 'TriMetaverse'
    }
  ] as ChatMessage[],
  loading: false,
  error: null,
  tokenInfo: {
    usedToken: 0,
    totalToken: 10000,
    outputToken: 0
  },
  
  // Provider相关状态
  selectedProvider: 'auto', // 默认走服务端自动路由
  selectedModel: '', // 选择的模型
  availableProviders: [],
  providersLoading: false,
  
  // 聊天模式相关状态
  chatMode: 'single', // 'single' | 'group'
  groupChatSettings: {
    selectedProviders: [], // 群聊中选择的多个Provider
    replyStrategy: 'discussion', // 'exclusive' | 'discussion' | 'supplement'
    systemPrompt: '你正在参加一场讨论，你可以随机选择一个自己的性格，用自己想要的风格（比如风趣）参与讨论，尽量用简短语言'
  }
};

// 创建切片
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // 创建群聊容器消息
    createGroupContainerMessage: (state, action) => {
      const id = action.payload.id || uuidv4();
      state.messages.push({
        id,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        responses: [],
        group_chat: true,
        provider: '群聊模式',
        model: 'group-chat',
        type: 'assistant',
        thinking: false,
        streaming: false
      } as any);
    },

    // 向群聊容器追加一个 provider 的响应 - 增强重复检测
    appendGroupResponse: (state, action) => {
      const { containerId, item } = action.payload;
      console.log('🔍 [Redux] appendGroupResponse 被调用:', {
        containerId,
        item: {
          provider: item.provider,
          contentLength: (item.content || '').length,
          aiName: item.aiName
        }
      });
      
      const idx = state.messages.findIndex(m => m.id === containerId);
      console.log('🔍 [Redux] 查找容器消息:', {
        containerId,
        foundIndex: idx,
        totalMessages: state.messages.length,
        messageIds: state.messages.map(m => m.id)
      });
      
      if (idx === -1) {
        console.error('❌ [Redux] 找不到容器消息:', containerId);
        return;
      }
      
      const msg = state.messages[idx];
      const nextResponses = Array.isArray(msg.responses) ? [...msg.responses] : [];
      
      // 🔥 重要修复：检查是否已存在相同provider的相同或相似内容
      const newContent = (item.content || '').trim();
      const newProvider = item.provider;
      
      const isDuplicate = nextResponses.some(response => {
        if (response.provider !== newProvider) return false;
        
        const existingContent = (response.content || '').trim();
        
        // 检查完全相同的内容
        if (existingContent === newContent) {
          console.warn('🚫 [Redux] 发现完全相同的内容，跳过:', {
            provider: newProvider,
            contentLength: newContent.length
          });
          return true;
        }
        
        // 检查高度相似的内容（一个是另一个的子集，且长度差异小于20字符）
        const lengthDiff = Math.abs(existingContent.length - newContent.length);
        const isSubset = existingContent.includes(newContent) || newContent.includes(existingContent);
        
        if (isSubset && lengthDiff < 20) {
          console.warn('🚫 [Redux] 发现相似内容，跳过:', {
            provider: newProvider,
            existingLength: existingContent.length,
            newLength: newContent.length,
            lengthDiff
          });
          return true;
        }
        
        return false;
      });
      
      if (isDuplicate) {
        console.log('🔍 [Redux] appendGroupResponse 跳过重复消息');
        return;
      }
      
      // 添加新的响应
      nextResponses.push({
        provider: item.provider,
        aiName: item.aiName || item.ai_name || item.provider,
        content: newContent,
        model: item.model,
        performance: item.performance,
        tokens: item.tokens,
        index: item.index,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ [Redux] appendGroupResponse 成功添加消息:', {
        provider: newProvider,
        contentLength: newContent.length,
        totalResponses: nextResponses.length
      });
      
      state.messages[idx] = {
        ...msg,
        responses: nextResponses
      };
    },
    // 发送消息 - 增强版重复检测
    sendMessage: (state, action) => {
      const messageId = action.payload.id || uuidv4();
      const messageContent = action.payload.content || '';
      const messageRole = action.payload.role;
      const currentTime = Date.now();
      
      console.log(`🔍 [Redux] 尝试添加${messageRole}消息:`, {
        id: messageId,
        content: messageContent.substring(0, 50) + '...',
        role: messageRole,
        provider: action.payload.provider
      });
      
      // 1. 检查ID重复
      const existingMessageById = state.messages.find(msg => msg.id === messageId);
      if (existingMessageById) {
        console.warn('🚫 [Redux] 消息ID已存在，跳过:', messageId);
        return;
      }
      
      // 2. 🔥 优化重复检测 - 只检查真正的重复，不阻止正常消息
      const allRecentMessages = state.messages.slice(-5); // 只检查最近5条消息，减少误判
      
      const isDuplicate = allRecentMessages.some(msg => {
        // 只检查完全相同的内容且时间很近的消息（5秒内）
        const msgTimestamp = typeof msg.timestamp === 'number' ? msg.timestamp : Date.now();
        const timeDiff = Math.abs(msgTimestamp - currentTime);
        
        if (timeDiff < 5000 && msg.role === messageRole) { // 5秒内同角色
          const content1 = (msg.content || '').trim();
          const content2 = messageContent.trim();
          
          // 只有完全相同的内容才认为是重复
          if (content1 === content2 && content1.length > 0) {
            console.warn('🚫 [Redux] 发现5秒内完全相同的消息');
            return true;
          }
        }
        
        return false;
      });
      
      if (isDuplicate) {
        console.warn(`🚫 [Redux] 检测到重复的${messageRole}消息，跳过添加:`, messageContent.substring(0, 100) + '...');
        return;
      }
      
      // 3. 创建新消息
      const newMessage: ChatMessage = {
        id: messageId,
        content: messageContent,
        role: messageRole,
        type: action.payload.type || (messageRole === 'user' ? 'user' : 'assistant'),
        timestamp: currentTime,
        thinking: action.payload.thinking || false,
        streaming: action.payload.streaming || false,
        performance: action.payload.performance || {
          first_token_time: 0,
          response_time: 0,
          tokens_per_second: 0
        },
        tokens: action.payload.tokens || {
          input: 0,
          output: 0,
          total: 0
        },
        provider: action.payload.provider,
        model: action.payload.model,
        aiName: action.payload.aiName
      };
      
      state.messages.push(newMessage);
      console.log(`✅ [Redux] 成功添加${messageRole}消息:`, {
        id: messageId,
        totalMessages: state.messages.length,
        content: messageContent.substring(0, 50) + '...'
      });
    },
    
    // 添加消息
    addMessage: (state, action) => {
      const newMessage = {
        id: action.payload.id || uuidv4(),
        content: action.payload.content || '',
        role: action.payload.role,
        type: action.payload.type || 'user',
        provider: action.payload.provider || null,
        model: action.payload.model || null,
        aiName: action.payload.aiName || null,
        timestamp: action.payload.timestamp || new Date().toISOString(),
        thinking: action.payload.thinking || false,
        streaming: action.payload.streaming || false,
        responses: action.payload.responses || [],
        group_chat: action.payload.group_chat || false,
        performance: action.payload.performance || {
          first_token_time: 0,
          response_time: 0,
          tokens_per_second: 0
        },
        tokens: action.payload.tokens || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          total_cost_cny: 0
        },
        error: action.payload.error || false
      };
      
      state.messages.push(newMessage);
    },
    
    // 接收消息
    receiveMessage: (state, action) => {
      const newMessage = {
        id: action.payload.id || uuidv4(), // 使用传入的ID或生成新的
        content: action.payload.content,
        role: action.payload.role,
        type: action.payload.type || 'user', // 保存消息类型
        provider: action.payload.provider || null, // 保存provider信息
        model: action.payload.model || null, // 保存model信息
        aiName: action.payload.aiName || null, // 保存AI名称
        timestamp: action.payload.timestamp || new Date().toISOString(),
        thinking: action.payload.thinking || false,
        performance: action.payload.performance || {
          first_token_time: 0,
          response_time: 0,
          tokens_per_second: 0
        },
        tokens: action.payload.tokens || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          total_cost_cny: 0
        }, // 保存token信息
        streaming: action.payload.streaming || false,
        error: action.payload.error || false
      };
      
      state.messages.push(newMessage);
      
      // 不在这里更新token信息，因为有专门的updateTokenInfo action
    },
    
    // 设置加载状态
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    
    // 清空聊天记录
    clearMessages: (state) => {
      state.messages = [];
    },

    // 去重消息
    deduplicateMessages: (state) => {
      console.log('🔄 开始去重消息，当前消息数量:', state.messages.length);
      
      const uniqueMessages: any[] = [];
      const seenContent = new Set<string>();
      const seenIds = new Set<string>();
      
      // 按时间排序处理消息
      const sortedMessages = [...state.messages].sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : Date.now());
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : Date.now());
        return timeA - timeB;
      });
      
      for (const message of sortedMessages) {
        const messageId = message.id;
        const messageContent = (message.content || '').trim();
        
        // 跳过空内容
        if (!messageContent) continue;
        
        // 检查ID重复
        if (seenIds.has(messageId)) {
          console.log('🚫 跳过重复ID:', messageId);
          continue;
        }
        
        // 检查内容重复
        if (seenContent.has(messageContent)) {
          console.log('🚫 跳过重复内容:', messageContent.substring(0, 50) + '...');
          continue;
        }
        
        // 添加到唯一消息列表
        uniqueMessages.push(message);
        seenIds.add(messageId);
        seenContent.add(messageContent);
      }
      
      state.messages = uniqueMessages;
      console.log('✅ 去重完成，剩余消息数量:', state.messages.length);
    },
    
    // 更新token信息
    updateTokenInfo: (state, action) => {
      state.tokenInfo = {
        ...state.tokenInfo,
        ...action.payload
      };
    },
    
    // 更新现有消息
    updateMessage: (state, action) => {
      const { id, ...updates } = action.payload;
      const messageIndex = state.messages.findIndex(msg => msg.id === id);
      
      if (messageIndex !== -1) {
        state.messages[messageIndex] = {
          ...state.messages[messageIndex],
          ...updates
        };
      }
    },
    
    // 删除消息
    removeMessage: (state, action) => {
      const { id } = action.payload;
      state.messages = state.messages.filter(msg => msg.id !== id);
    },
    
    // 设置选择的Provider
    setSelectedProvider: (state, action) => {
      state.selectedProvider = action.payload;
    },
    
    // 设置选择的模型
    setSelectedModel: (state, action) => {
      state.selectedModel = action.payload;
    },
    setAvailableProviders: (state, action) => {
      state.availableProviders = action.payload;
      state.providersLoading = false;
    },
    
    // 设置聊天模式
    setChatMode: (state, action) => {
      state.chatMode = action.payload;
    },
    
    // 设置群聊设置
    setGroupChatSettings: (state, action) => {
      state.groupChatSettings = {
        ...state.groupChatSettings,
        ...action.payload
      };
      // 同时保存到localStorage
      try {
        localStorage.setItem('group_chat_settings', JSON.stringify(state.groupChatSettings));
        console.log('群聊设置已保存到localStorage:', state.groupChatSettings);
      } catch (error) {
        console.error('保存群聊设置到localStorage失败:', error);
      }
    },
    
    // 设置Provider加载状态
    setProvidersLoading: (state, action) => {
      state.providersLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取聊天历史
      .addCase(fetchChatHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.loading = false;
        // 处理API响应数据格式
        if (Array.isArray(action.payload)) {
          state.messages = action.payload;
        } else if (action.payload && Array.isArray(action.payload.data)) {
          state.messages = action.payload.data;
        } else {
          state.messages = [];
        }
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // 发送消息
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        // 不在这里自动添加AI消息，让ChatPanel组件控制打字机效果
        console.log('✅ 消息发送成功，等待ChatPanel处理打字机效果');
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('❌ 发送消息失败:', action.payload);
      })
      // 获取可用Provider列表
      .addCase(fetchAvailableProviders.pending, (state) => {
        state.providersLoading = true;
        state.error = null;
      })
      .addCase(fetchAvailableProviders.fulfilled, (state, action) => {
        state.providersLoading = false;
        // 处理/api/providers端点返回的数据格式 {success: true, providers: [...]}
        const payload = action.payload as any;
        
        if (payload && payload.providers && Array.isArray(payload.providers)) {
          // 只包含已启用的提供商
          const enabledProviders = payload.providers.filter((provider: any) => 
            provider.config && provider.config.enabled
          );
          
          console.log('Loaded providers from backend:', payload.providers.length);
          console.log('Enabled providers:', enabledProviders.length);
          console.log('First enabled provider:', enabledProviders[0]);
          
          state.availableProviders = enabledProviders;
        } else if (Array.isArray(payload)) {
          state.availableProviders = payload;
        } else {
          console.warn('Unexpected providers data format:', payload);
          state.availableProviders = [];
        }
      })
      .addCase(fetchAvailableProviders.rejected, (state, action) => {
        state.providersLoading = false;
        state.error = action.payload;
      });
  }
});

// 导出actions
export const { 
  sendMessage: sendMessageAction, 
  addMessage,
  receiveMessage, 
  setLoading, 
  clearMessages,
  deduplicateMessages,
  updateTokenInfo,
  updateMessage,
  removeMessage,
  setSelectedProvider,
  setSelectedModel,
  setChatMode,
  setGroupChatSettings,
  setAvailableProviders,
  setProvidersLoading,
  createGroupContainerMessage,
  appendGroupResponse
} = chatSlice.actions;

// 导出reducer
export default chatSlice.reducer;