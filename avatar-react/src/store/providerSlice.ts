import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { chatAPI } from '../services/api';

// 异步操作：测试Provider连接
export const testProviderConnection = createAsyncThunk<
  { provider: string; result: any },
  string,
  { rejectValue: { provider: string; error: string } }
>(
  'providers/testConnection',
  async (providerName, { rejectWithValue }) => {
    try {
      const response = await chatAPI.testProviderConnection(providerName);
      return { provider: providerName, result: response };
    } catch (error: any) {
      return rejectWithValue({ 
        provider: providerName, 
        error: error.response?.data || error.message 
      });
    }
  }
);

// 异步操作：获取模型列表
export const fetchAvailableModels = createAsyncThunk(
  'providers/fetchModels',
  async (_, { rejectWithValue }) => {
    try {
      const response = await chatAPI.getAvailableModels();
      console.log('fetchAvailableModels response:', response);
      
      // 处理API响应
      if (response.data && response.data.success) {
        return {
          models: response.data.data.models || [],
          providers: response.data.data.providers || []
        };
      } else {
        return {
          models: [],
          providers: []
        };
      }
    } catch (error) {
      console.error('fetchAvailableModels error:', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 初始状态
const initialState = {
  // Provider列表 - 将从后端API获取
  providers: [],
  
  // 可用模型列表
  availableModels: [],
  
  // 加载状态
  loading: false,
  testingConnections: {}, // { providerName: boolean }
  
  // 错误状态
  error: null,
  connectionErrors: {}, // { providerName: errorMessage }
  
  // 用户偏好设置
  userPreferences: {
    defaultProvider: 'openrouter',
    autoTestConnections: true,
    preferredModels: {}
  }
};

// 创建切片
const providerSlice = createSlice({
  name: 'providers',
  initialState,
  reducers: {
    // 设置Provider状态
    setProviderStatus: (state, action) => {
      const { provider, status } = action.payload;
      const providerIndex = state.providers.findIndex(p => p.name === provider);
      
      if (providerIndex !== -1) {
        state.providers[providerIndex].status = status;
        state.providers[providerIndex].lastTested = new Date().toISOString();
      }
    },
    
    // 更新Provider信息
    updateProvider: (state, action) => {
      const { provider, updates } = action.payload;
      const providerIndex = state.providers.findIndex(p => p.name === provider);
      
      if (providerIndex !== -1) {
        state.providers[providerIndex] = {
          ...state.providers[providerIndex],
          ...updates
        };
      }
    },
    
    // 设置连接测试状态
    setConnectionTesting: (state, action) => {
      const { provider, testing } = action.payload;
      state.testingConnections[provider] = testing;
    },
    
    // 设置连接错误
    setConnectionError: (state, action) => {
      const { provider, error } = action.payload;
      if (error) {
        state.connectionErrors[provider] = error;
      } else {
        delete state.connectionErrors[provider];
      }
    },
    
    // 更新用户偏好
    updateUserPreferences: (state, action) => {
      state.userPreferences = {
        ...state.userPreferences,
        ...action.payload
      };
    },
    
    // 清除所有错误
    clearErrors: (state) => {
      state.error = null;
      state.connectionErrors = {};
    }
  },
  extraReducers: (builder) => {
    builder
      // 测试Provider连接
      .addCase(testProviderConnection.pending, (state, action) => {
        const provider = action.meta.arg;
        state.testingConnections[provider] = true;
        delete state.connectionErrors[provider];
      })
      .addCase(testProviderConnection.fulfilled, (state, action) => {
        const { provider } = action.payload;
        state.testingConnections[provider] = false;
        
        const providerIndex = state.providers.findIndex(p => p.name === provider);
        if (providerIndex !== -1) {
          state.providers[providerIndex].status = 'online';
          state.providers[providerIndex].lastTested = new Date().toISOString();
        }
      })
      .addCase(testProviderConnection.rejected, (state, action) => {
        const provider = action.meta.arg;
        const error = action.payload?.error || 'Connection failed';
        
        state.testingConnections[provider] = false;
        state.connectionErrors[provider] = error;
        
        const providerIndex = state.providers.findIndex(p => p.name === provider);
        if (providerIndex !== -1) {
          state.providers[providerIndex].status = 'offline';
          state.providers[providerIndex].lastTested = new Date().toISOString();
        }
      })
      // 获取模型列表
      .addCase(fetchAvailableModels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableModels.fulfilled, (state, action) => {
        state.loading = false;
        state.availableModels = action.payload.models || [];
        
        // 更新提供商列表和状态
        if (action.payload.providers) {
          state.providers = action.payload.providers.map(provider => ({
            name: provider.name,
            status: provider.status || 'online',
            enabled: provider.enabled || true,
            models: provider.models || [],
            lastTested: new Date().toISOString()
          }));
        }
      })
      .addCase(fetchAvailableModels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// 导出actions
export const {
  setProviderStatus,
  updateProvider,
  setConnectionTesting,
  setConnectionError,
  updateUserPreferences,
  clearErrors
} = providerSlice.actions;

// 导出selector - 使用memoization优化性能
export const selectProviders = (state) => state.providers.providers;

// Memoized selectors to prevent unnecessary rerenders
export const selectOnlineProviders = createSelector(
  [selectProviders],
  (providers) => providers.filter(p => p.status === 'online')
);

export const selectProviderByName = createSelector(
  [selectProviders, (state, providerName) => providerName],
  (providers, providerName) => providers.find(p => p.name === providerName)
);

export const selectProviderStatus = createSelector(
  [selectProviderByName],
  (provider) => provider?.status || 'unknown'
);

export const selectIsProviderTesting = (state, providerName) => 
  state.providers.testingConnections[providerName] || false;
export const selectProviderError = (state, providerName) => 
  state.providers.connectionErrors[providerName] || null;

// 导出reducer
export default providerSlice.reducer;