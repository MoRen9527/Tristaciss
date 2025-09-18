import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../services/api';

// 定义类型接口
interface LoginCredentials {
  username: string;
  password: string;
}

interface User {
  id?: string;
  username: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

// 异步操作：用户登录
export const login = createAsyncThunk<User, LoginCredentials>(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue, dispatch }) => {
    try {
      // 先清除之前可能存在的token
      localStorage.removeItem('token');
      
      // 添加延迟，确保前一个请求完全结束
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await authAPI.login(credentials);
      console.log('登录响应:', response);
      
      // 处理Vue后端的响应格式
      // 后端成功响应格式: { user: { username, ... } }
      const responseData: any = response.data || response;
      if (responseData && responseData.user) {
        // 使用会话cookie认证，不需要存储token
        localStorage.setItem('token', 'session-cookie-auth');
        
        // 添加延迟，确保token已经保存
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return responseData.user;
      } else if (responseData && responseData.message === 'success') {
        // 有些后端可能不直接返回user对象，而是返回成功消息
        // 在这种情况下，我们手动构建一个用户对象
        localStorage.setItem('token', 'session-cookie-auth');
        
        // 尝试获取用户信息
        try {
          const userResponse = await authAPI.getCurrentUser();
          const userResponseData: any = userResponse.data || userResponse;
          if (userResponseData && userResponseData.user) {
            return userResponseData.user;
          }
        } catch (userError) {
          console.warn('获取用户信息失败，使用默认用户信息');
        }
        
        // 如果无法获取用户信息，使用凭据中的用户名创建一个基本用户对象
        return { username: credentials.username };
      } else {
        // 如果没有user字段，说明登录失败
        return rejectWithValue(responseData.detail || responseData.error || '登录失败');
      }
    } catch (error) {
      console.error('登录错误:', error);
      
      // 检查是否是网络错误但实际上登录可能已成功
      // 这种情况可能发生在后端设置了cookie但响应解析失败
      if (error.message === 'Network Error' || error.message.includes('network')) {
        try {
          // 尝试检查是否已经登录成功
          localStorage.setItem('token', 'session-cookie-auth');
          const checkResponse = await authAPI.getCurrentUser();
          const checkResponseData: any = checkResponse.data || checkResponse;
          
          if (checkResponseData && checkResponseData.user) {
            console.log('尽管有网络错误，但用户已成功登录');
            return checkResponseData.user;
          }
        } catch (checkError) {
          // 如果检查也失败，则确实是登录失败
          localStorage.removeItem('token');
        }
      }
      
      // 处理HTTP错误响应
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.detail || error.response.data.error || '登录失败');
      }
      return rejectWithValue(error.message || '网络错误');
    }
  }
);

// 异步操作：用户注册
export const register = createAsyncThunk<User, any>(
  'auth/register',
  async (userData: any, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      const responseData: any = response.data || response;
      // 保存token到localStorage
      localStorage.setItem('token', responseData.token);
      return responseData.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 异步操作：检查认证状态
export const checkAuth = createAsyncThunk<User | null, void>(
  'auth/checkAuth',
  async (_, { rejectWithValue, getState }) => {
    // 检查当前状态，避免重复请求
    const state: any = getState();
    const { auth } = state;
    
    // 如果已经在加载中，则跳过
    if (auth.loading) {
      console.log('认证检查已在进行中，跳过重复请求');
      return auth.user;
    }
    
    // 如果没有token，直接返回null，不发送请求
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('本地没有token，跳过认证检查');
      return null;
    }
    
    try {
      // 获取当前用户信息，包含凭据（cookies）
      const response = await authAPI.getCurrentUser();
      const responseData: any = response.data || response;
      
      if (responseData && responseData.user) {
        return responseData.user;
      } else {
        // 清除可能存在的token
        localStorage.removeItem('token');
        return null;
      }
    } catch (error) {
      // 如果获取用户信息失败，清除token并返回null而不是错误
      localStorage.removeItem('token');
      console.log('用户未认证，清除本地状态');
      return null;
    }
  }
);

// 异步操作：退出登录
export const logout = createAsyncThunk<null, void>(
  'auth/logout',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await authAPI.logout();
      // 清除localStorage中的token
      localStorage.removeItem('token');
      // 强制刷新页面，确保重定向到登录页面
      // 使用完整的URL路径，避免相对路径问题
      window.location.replace('/login');
      // 添加备用方法，以防上面的方法不起作用
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      return null;
    } catch (error) {
      // 即使API调用失败，也要清除本地状态并重定向
      localStorage.removeItem('token');
      window.location.replace('/login');
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

  // 初始状态
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false, // 异步操作是否进行，改为false，避免自动触发认证检查
  error: null,
  loginSuccess: false // 用于触发登录成功后的加载动画
};

// 创建切片
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 清除错误信息
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 用户登录
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.loginSuccess = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.loginSuccess = true; // 设置登录成功状态，触发圆周扫描加载动画
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 用户注册
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 检查认证状态
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = !!action.payload;
        state.user = action.payload;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload;
      })
      
      // 退出登录
      .addCase(logout.pending, (state) => {
        state.loading = true;
        state.loginSuccess = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.loginSuccess = false;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// 导出actions
export const { clearError } = authSlice.actions;

// 导出reducer
export default authSlice.reducer;