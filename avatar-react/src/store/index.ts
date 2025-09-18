import { configureStore } from '@reduxjs/toolkit';
import chatReducer, { appendGroupResponse, createGroupContainerMessage } from './chatSlice';
import dashboardReducer from './dashboardSlice';
import authReducer from './authSlice';
import dynamicCardsReducer from './dynamicCardSlice';
import providerReducer from './providerSlice';

// 配置Redux存储
const store = configureStore({
  reducer: {
    chat: chatReducer,
    dashboard: dashboardReducer,
    auth: authReducer,
    dynamicCards: dynamicCardsReducer,
    providers: providerReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // 允许非序列化值，如函数
    })
});

// 🔥 关键修复：设置事件监听器来处理群聊事件
let groupChatContainerId: string | null = null;
let eventListenersAdded = false; // 防重复标志

// 防重复添加事件监听器
if (!eventListenersAdded) {
  eventListenersAdded = true;
  
  // 监听群聊开始事件，创建容器消息
  window.addEventListener('groupChatProviderStart', (event: any) => {
    const { provider, aiName, index } = event.detail;
    console.log('🔍 [Store] 收到 groupChatProviderStart 事件:', { provider, aiName, index });
    
    // 只在第一个 provider 开始时创建容器
    if (index === 0 && !groupChatContainerId) {
      groupChatContainerId = `group_${Date.now()}`;
      console.log('🔍 [Store] 创建群聊容器:', groupChatContainerId);
      store.dispatch(createGroupContainerMessage({ id: groupChatContainerId }));
    }
  });

  // 监听群聊 provider 结束事件
  window.addEventListener('groupChatProviderEnd', (event: any) => {
    const data = event.detail;
    console.log('🔍 [Store] 收到 groupChatProviderEnd 事件:', data);
    
    if (!groupChatContainerId) {
      console.error('❌ [Store] 没有群聊容器ID，无法添加响应');
      return;
    }
    
    // 调用 Redux action 添加响应
    store.dispatch(appendGroupResponse({
      containerId: groupChatContainerId,
      item: {
        provider: data.provider,
        aiName: data.aiName || data.provider,
        model: data.model || 'unknown',
        content: data.content || '',
        usage: data.tokens,
        cost: data.tokens?.total_cost_cny || 0,
        timestamp: Date.now(),
        // 🔥 关键修复：添加性能和 token 信息
        performance: data.performance,
        tokens: data.tokens
      }
    }));
  });

  // 监听群聊完成事件，延迟重置容器ID
  window.addEventListener('groupChatComplete', (event: any) => {
    console.log('🔍 [Store] 群聊完成，延迟重置容器ID');
    
    // 🔥 关键修复：重置 loading 状态
    store.dispatch({ type: 'chat/setLoading', payload: false });
    console.log('🔍 [Store] 已重置 loading 状态为 false');
    
    // 延迟重置，确保所有 provider 的响应都已处理完成
    setTimeout(() => {
      console.log('🔍 [Store] 延迟重置容器ID');
      groupChatContainerId = null;
    }, 1000);
  });
}

export default store;

// 导出RootState类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;