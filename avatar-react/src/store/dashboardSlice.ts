import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { dashboardAPI } from '../services/api';

// 类型定义
interface SystemStatusHistory {
  cpu: number[];
  memory: number[];
  network: number[];
  temperature: number[];
}

interface SystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  networkSpeed: number;
  temperature: number;
  history: SystemStatusHistory;
}

interface AIStatusHistory {
  activeModels: number[];
  totalRequests: number[];
  avgResponseTime: number[];
  errorRate: number[];
}

interface AIStatus {
  activeModels: number;
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  history: AIStatusHistory;
}

interface Card {
  id: string;
  title: string;
  pending: boolean;
}

interface LoadingState {
  system: boolean;
  ai: boolean;
}

interface DashboardState {
  systemStatus: SystemStatus;
  aiStatus: AIStatus;
  activeCards: Card[];
  loading: LoadingState;
  error: string | null;
}

// 异步操作的返回类型
interface SystemStatusResponse {
  cpuUsage: number;
  memoryUsage: number;
  networkSpeed: number;
  temperature: number;
}

interface AIStatusResponse {
  activeModels: number;
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
}

// 异步操作：获取系统状态
export const fetchSystemStatus = createAsyncThunk<
  SystemStatusResponse,
  void,
  { rejectValue: string }
>(
  'dashboard/fetchSystemStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardAPI.getSystemStatus();
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to fetch system status');
    }
  }
);

// 异步操作：获取AI状态
export const fetchAIStatus = createAsyncThunk<
  AIStatusResponse,
  void,
  { rejectValue: string }
>(
  'dashboard/fetchAIStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardAPI.getAIStatus();
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to fetch AI status');
    }
  }
);

// 初始状态
const initialState: DashboardState = {
  systemStatus: {
    cpuUsage: 0,
    memoryUsage: 0,
    networkSpeed: 0,
    temperature: 0,
    history: {
      cpu: [],
      memory: [],
      network: [],
      temperature: []
    }
  },
  aiStatus: {
    activeModels: 0,
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    history: {
      activeModels: [],
      totalRequests: [],
      avgResponseTime: [],
      errorRate: []
    }
  },
  // 添加信息卡片数据
  activeCards: [
    {
      id: 'system',
      title: '系统状态',
      pending: false
    },
    {
      id: 'conversation',
      title: '对话分析',
      pending: false
    },
    {
      id: 'knowledge',
      title: '知识库状态',
      pending: false
    },
    {
      id: 'modelViz',
      title: '模型思考可视化',
      pending: false
    },
    {
      id: 'digitalAvatar',
      title: '数字分身',
      pending: false
    }
  ],
  loading: {
    system: false,
    ai: false
  },
  error: null
};

// 创建切片
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    // 更新系统状态
    updateSystemStatus: (state, action: PayloadAction<SystemStatusResponse>) => {
      const { cpuUsage, memoryUsage, networkSpeed, temperature } = action.payload;
      
      // 更新当前值
      state.systemStatus.cpuUsage = cpuUsage;
      state.systemStatus.memoryUsage = memoryUsage;
      state.systemStatus.networkSpeed = networkSpeed;
      state.systemStatus.temperature = temperature;
      
      // 更新历史数据
      state.systemStatus.history.cpu.push(cpuUsage);
      state.systemStatus.history.memory.push(memoryUsage);
      state.systemStatus.history.network.push(networkSpeed);
      state.systemStatus.history.temperature.push(temperature);
      
      // 保持历史数据长度为10
      if (state.systemStatus.history.cpu.length > 10) {
        state.systemStatus.history.cpu.shift();
        state.systemStatus.history.memory.shift();
        state.systemStatus.history.network.shift();
        state.systemStatus.history.temperature.shift();
      }
    },
    
    // 更新AI状态
    updateAIStatus: (state, action: PayloadAction<AIStatusResponse>) => {
      const { activeModels, totalRequests, avgResponseTime, errorRate } = action.payload;
      
      // 更新当前值
      state.aiStatus.activeModels = activeModels;
      state.aiStatus.totalRequests = totalRequests;
      state.aiStatus.avgResponseTime = avgResponseTime;
      state.aiStatus.errorRate = errorRate;
      
      // 更新历史数据
      state.aiStatus.history.activeModels.push(activeModels);
      state.aiStatus.history.totalRequests.push(totalRequests);
      state.aiStatus.history.avgResponseTime.push(avgResponseTime);
      state.aiStatus.history.errorRate.push(errorRate);
      
      // 保持历史数据长度为10
      if (state.aiStatus.history.activeModels.length > 10) {
        state.aiStatus.history.activeModels.shift();
        state.aiStatus.history.totalRequests.shift();
        state.aiStatus.history.avgResponseTime.shift();
        state.aiStatus.history.errorRate.shift();
      }
    },
    
    // 添加信息卡片
    addCard: (state, action: PayloadAction<Omit<Card, 'pending'>>) => {
      const newCard: Card = {
        ...action.payload,
        pending: true
      };
      state.activeCards.push(newCard);
    },
    
    // 确认信息卡片
    confirmCard: (state, action: PayloadAction<string>) => {
      const cardId = action.payload;
      const cardIndex = state.activeCards.findIndex(card => card.id === cardId);
      if (cardIndex !== -1) {
        state.activeCards[cardIndex].pending = false;
      }
    },
    
    // 拒绝信息卡片
    rejectCard: (state, action: PayloadAction<string>) => {
      const cardId = action.payload;
      state.activeCards = state.activeCards.filter(card => card.id !== cardId);
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取系统状态
      .addCase(fetchSystemStatus.pending, (state) => {
        state.loading.system = true;
        state.error = null;
      })
      .addCase(fetchSystemStatus.fulfilled, (state, action) => {
        state.loading.system = false;
        const { cpuUsage, memoryUsage, networkSpeed, temperature } = action.payload;
        
        // 更新当前值
        state.systemStatus.cpuUsage = cpuUsage;
        state.systemStatus.memoryUsage = memoryUsage;
        state.systemStatus.networkSpeed = networkSpeed;
        state.systemStatus.temperature = temperature;
        
        // 更新历史数据
        state.systemStatus.history.cpu.push(cpuUsage);
        state.systemStatus.history.memory.push(memoryUsage);
        state.systemStatus.history.network.push(networkSpeed);
        state.systemStatus.history.temperature.push(temperature);
        
        // 保持历史数据长度为10
        if (state.systemStatus.history.cpu.length > 10) {
          state.systemStatus.history.cpu.shift();
          state.systemStatus.history.memory.shift();
          state.systemStatus.history.network.shift();
          state.systemStatus.history.temperature.shift();
        }
      })
      .addCase(fetchSystemStatus.rejected, (state, action) => {
        state.loading.system = false;
        state.error = (action.payload as string) || 'Failed to fetch system status';
      })
      
      // 获取AI状态
      .addCase(fetchAIStatus.pending, (state) => {
        state.loading.ai = true;
        state.error = null;
      })
      .addCase(fetchAIStatus.fulfilled, (state, action) => {
        state.loading.ai = false;
        const { activeModels, totalRequests, avgResponseTime, errorRate } = action.payload;
        
        // 更新当前值
        state.aiStatus.activeModels = activeModels;
        state.aiStatus.totalRequests = totalRequests;
        state.aiStatus.avgResponseTime = avgResponseTime;
        state.aiStatus.errorRate = errorRate;
        
        // 更新历史数据
        state.aiStatus.history.activeModels.push(activeModels);
        state.aiStatus.history.totalRequests.push(totalRequests);
        state.aiStatus.history.avgResponseTime.push(avgResponseTime);
        state.aiStatus.history.errorRate.push(errorRate);
        
        // 保持历史数据长度为10
        if (state.aiStatus.history.activeModels.length > 10) {
          state.aiStatus.history.activeModels.shift();
          state.aiStatus.history.totalRequests.shift();
          state.aiStatus.history.avgResponseTime.shift();
          state.aiStatus.history.errorRate.shift();
        }
      })
      .addCase(fetchAIStatus.rejected, (state, action) => {
        state.loading.ai = false;
        state.error = (action.payload as string) || 'Failed to fetch AI status';
      });
  }
});

// 导出actions
export const { 
  updateSystemStatus, 
  updateAIStatus,
  addCard,
  confirmCard,
  rejectCard
} = dashboardSlice.actions;

// 导出reducer
export default dashboardSlice.reducer;

// 导出类型供其他文件使用
export type { DashboardState, SystemStatus, AIStatus, Card };