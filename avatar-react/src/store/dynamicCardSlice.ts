import { createSlice } from '@reduxjs/toolkit';

// 关键词映射到信息卡类型
const KEYWORD_CARD_MAPPING = {
  '系统状态': 'systemStatus',
  '状态': 'systemStatus',
  '性能': 'systemStatus',
  '对话分析': 'conversationAnalysis',
  '分析': 'conversationAnalysis',
  '情感': 'conversationAnalysis',
  '工作流': 'workflow',
  '流程': 'workflow',
  '任务': 'workflow',
  '数据': 'dataVisualization',
  '可视化': 'dataVisualization',
  '图表': 'dataVisualization',
  '用户信息': 'userProfile',
  '个人资料': 'userProfile',
  '设置': 'userProfile',
  '模型': 'modelInfo',
  'AI': 'modelInfo',
  '智能': 'modelInfo',
  '安全': 'security',
  '权限': 'security',
  '日志': 'systemLogs',
  '记录': 'systemLogs',
  '历史': 'systemLogs',
  '启动ai编程': 'aiProgramming'
};

// 信息卡模板
const CARD_TEMPLATES = {
  // 帮助命令
  help: {
    id: 'help',
    type: 'help',
    title: '命令帮助',
    icon: 'help',
    priority: 10,
    category: 'help',
    data: {
      commands: [
        { command: '/system', description: '显示系统状态信息', alias: '/系统' },
        { command: '/conversation', description: '显示对话分析数据', alias: '/对话' },
        { command: '/knowledge', description: '显示知识库状态', alias: '/知识库' },
        { command: '/model', description: '显示AI模型信息', alias: '/模型' },
        { command: '/security', description: '显示安全监控状态', alias: '/安全' },
        { command: '/logs', description: '显示系统日志信息', alias: '/日志' },
        { command: '/workflow', description: '显示工作流状态', alias: '/工作流' },
        { command: '/profile', description: '显示用户档案信息', alias: '/档案' },
        { command: '/help', description: '显示此帮助信息', alias: '/帮助' }
      ],
      totalCommands: 9,
      supportLanguages: ['English', '中文'],
      usage: '在聊天中输入命令即可触发对应的信息卡片'
    }
  },
  system: {
    id: 'system',
    type: 'system',
    title: '系统状态监控',
    icon: 'monitor',
    priority: 9,
    category: 'system',
    data: {
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 38,
      networkLatency: 25,
      serviceStatus: 'normal',
      uptime: '7天 14小时 23分钟'
    }
  },
  conversation: {
    id: 'conversation',
    type: 'conversation',
    title: '对话分析',
    icon: 'analytics',
    priority: 8,
    category: 'analysis',
    data: {
      sentiment: 'positive',
      emotion: '友好',
      topicTrends: ['技术讨论', 'UI设计', '用户体验'],
      messageCount: 12,
      averageResponseTime: 1.2,
      userEngagement: 85
    }
  },
  knowledge: {
    id: 'knowledge',
    type: 'knowledge',
    title: '知识库状态',
    icon: 'library',
    priority: 7,
    category: 'knowledge',
    data: {
      totalDocuments: 1247,
      indexedDocuments: 1200,
      lastUpdate: new Date().toISOString(),
      searchAccuracy: 96.5,
      categories: ['技术文档', '用户手册', 'API文档']
    }
  },
  model: {
    id: 'model',
    type: 'model',
    title: 'AI模型信息',
    icon: 'brain',
    priority: 6,
    category: 'ai',
    data: {
      modelName: 'DeepSeek-V2',
      version: 'v2.5',
      accuracy: 98.7,
      responseTime: 850,
      tokenUsage: 15420,
      confidence: 94.2
    }
  },
  security: {
    id: 'security',
    type: 'security',
    title: '安全监控',
    icon: 'security',
    priority: 10,
    category: 'security',
    data: {
      securityLevel: 'high',
      threatLevel: 'low',
      lastScan: '刚刚',
      blockedAttacks: 0,
      authStatus: 'verified',
      encryption: 'AES-256'
    }
  },
  logs: {
    id: 'logs',
    type: 'logs',
    title: '系统日志',
    icon: 'logs',
    priority: 4,
    category: 'logs',
    data: {
      totalLogs: 2847,
      errorCount: 0,
      warningCount: 3,
      lastError: null,
      logLevel: 'INFO',
      retention: '30天'
    }
  },
  workflow: {
    id: 'workflow',
    type: 'workflow',
    title: '智能工作流',
    icon: 'workflow',
    priority: 7,
    category: 'automation',
    data: {
      activeWorkflows: 3,
      completedTasks: 15,
      pendingTasks: 7,
      efficiency: 92,
      nextAction: '数据同步',
      estimatedCompletion: '15分钟'
    }
  },
  profile: {
    id: 'profile',
    type: 'profile',
    title: '用户档案',
    icon: 'user',
    priority: 5,
    category: 'profile',
    data: {
      userName: 'demo',
      userLevel: '高级用户',
      sessionTime: '2小时 34分钟',
      totalSessions: 157,
      preferredTopics: ['科技', 'AI', '设计'],
      activityScore: 92
    }
  },
  aiProgramming: {
    id: 'aiProgramming',
    type: 'aiProgramming',
    title: 'AI编程助手',
    icon: 'code',
    priority: 10, // 最高优先级
    category: 'programming',
    data: {
      mode: 'editor',
      language: 'python',
      lastEdit: new Date().toISOString(),
      suggestions: 0,
      activeFile: null,
      fileTree: []
    }
  },
  groupChat: {
    id: 'groupChat',
    type: 'groupChat',
    title: '群聊模型选择',
    icon: 'group',
    priority: 9,
    category: 'chat',
    data: {
      selectedModels: [],
      availableModels: [],
      chatMode: 'group',
      lastUpdate: new Date().toISOString(),
      modelCount: 0
    }
  },
  quickCommand: {
    id: 'quickCommand',
    type: 'quickCommand',
    title: '信息卡快速调用',
    icon: 'help',
    priority: 11, // 最高优先级，确保在顶部显示
    category: 'system',
    data: {
      commands: [],
      description: '点击关键字或输入关键字快速调用信息卡（支持中英文）',
      lastUpdate: new Date().toISOString()
    }
  }
};

const initialState = {
  cards: [], // 当前显示的信息卡栈
  cardHistory: [], // 历史信息卡记录
  maxCards: 6, // 最大显示卡片数量
  keywordDetection: true, // 是否启用关键词检测
  detectedKeywords: [], // 最近检测到的关键词
};

const dynamicCardSlice = createSlice({
  name: 'dynamicCards',
  initialState,
  reducers: {
    // 添加新信息卡到栈顶
    pushCard: (state, action) => {
      const { cardType, trigger, timestamp = Date.now() } = action.payload;
      
      // 获取卡片模板
      const template = CARD_TEMPLATES[cardType];
      if (!template) return;
      
      // 检查是否已存在相同类型的卡片（防止重复）
      const existingCardIndex = state.cards.findIndex(card => card.type === cardType);
      
      // 如果存在相同类型的卡片，移除旧的
      if (existingCardIndex !== -1) {
        const removedCard = state.cards.splice(existingCardIndex, 1)[0];
        console.log('移除重复卡片:', removedCard.id);
      }
      
      // 创建新卡片实例
      const newCard = {
        ...template,
        id: `${cardType}_${timestamp}`,
        timestamp,
        trigger,
        isNew: true
      };
      
      // 添加到栈顶（最新的卡片在顶部）
      state.cards.unshift(newCard);
      
      // 按时间戳排序，确保最新的在顶部（作为保险机制）
      state.cards.sort((a, b) => b.timestamp - a.timestamp);
      
      // 限制最大卡片数量，移除最旧的卡片
      if (state.cards.length > state.maxCards) {
        const removedCard = state.cards.pop();
        state.cardHistory.push(removedCard);
      }
      
      // 记录历史
      state.cardHistory.push({
        action: 'push',
        cardType,
        trigger,
        timestamp
      });
    },
    
    // 移除指定信息卡
    removeCard: (state, action) => {
      const cardId = action.payload;
      const index = state.cards.findIndex(card => card.id === cardId);
      
      if (index !== -1) {
        const removedCard = state.cards.splice(index, 1)[0];
        state.cardHistory.push({
          action: 'remove',
          cardType: removedCard.type,
          timestamp: Date.now()
        });
      }
    },
    
    // 清除所有信息卡
    clearCards: (state) => {
      state.cardHistory.push({
        action: 'clear',
        count: state.cards.length,
        timestamp: Date.now()
      });
      state.cards = [];
    },
    
    // 更新信息卡数据
    updateCardData: (state, action) => {
      const { cardId, data } = action.payload;
      const card = state.cards.find(c => c.id === cardId);
      
      if (card) {
        card.data = { ...card.data, ...data };
        card.lastUpdated = Date.now();
      }
    },
    
    // 检测关键词并触发信息卡
    detectKeywords: (state, action) => {
      const { text, messageId } = action.payload;
      
      if (!state.keywordDetection) return;
      
      const detectedCards = [];
      const lowerText = text.toLowerCase();
      
      // 按优先级检测关键词（优先检测更具体的关键词）
      const keywordEntries = Object.entries(KEYWORD_CARD_MAPPING);
      // 按关键词长度排序，优先匹配更具体的关键词
      keywordEntries.sort((a, b) => b[0].length - a[0].length);
      
      for (const [keyword, cardType] of keywordEntries) {
        if (lowerText.includes(keyword)) {
          detectedCards.push({
            keyword,
            cardType,
            messageId,
            priority: keyword.length // 更长的关键词优先级更高
          });
        }
      }
      
      // 记录检测到的关键词
      state.detectedKeywords.push({
        text,
        messageId,
        keywords: detectedCards,
        timestamp: Date.now()
      });
      
      // 保留最近20条记录
      if (state.detectedKeywords.length > 20) {
        state.detectedKeywords = state.detectedKeywords.slice(-20);
      }
      
      // 只推送优先级最高的一个卡片（避免一次插入多个）
      if (detectedCards.length > 0) {
        // 按优先级排序，选择最高优先级的
        detectedCards.sort((a, b) => b.priority - a.priority);
        const bestMatch = detectedCards[0];
        
        // 直接调用 pushCard reducer
        const pushCardAction = {
          type: 'dynamicCard/pushCard',
          payload: {
            cardType: bestMatch.cardType,
            trigger: `关键词: ${bestMatch.keyword}`,
            timestamp: Date.now()
          }
        };
        dynamicCardSlice.caseReducers.pushCard(state, pushCardAction);
      }
    },
    
    // 设置关键词检测开关
    toggleKeywordDetection: (state) => {
      state.keywordDetection = !state.keywordDetection;
    },
    
    // 标记卡片为已读
    markCardAsRead: (state, action) => {
      const cardId = action.payload;
      const card = state.cards.find(c => c.id === cardId);
      
      if (card) {
        card.isNew = false;
        card.lastViewed = Date.now();
      }
    },
    
    // 设置最大卡片数量
    setMaxCards: (state, action) => {
      state.maxCards = Math.max(1, Math.min(10, action.payload));
      
      // 如果当前卡片数量超过新的最大值，移除多余的
      while (state.cards.length > state.maxCards) {
        const removedCard = state.cards.pop();
        state.cardHistory.push(removedCard);
      }
    }
  }
});

export const {
  pushCard,
  removeCard,
  clearCards,
  updateCardData,
  detectKeywords,
  toggleKeywordDetection,
  markCardAsRead,
  setMaxCards
} = dynamicCardSlice.actions;

export default dynamicCardSlice.reducer;

// 选择器
export const selectCards = (state) => state.dynamicCards.cards;
export const selectCardHistory = (state) => state.dynamicCards.cardHistory;
export const selectKeywordDetection = (state) => state.dynamicCards.keywordDetection;
export const selectDetectedKeywords = (state) => state.dynamicCards.detectedKeywords;
export const selectMaxCards = (state) => state.dynamicCards.maxCards;

// 辅助函数
export const getCardTemplate = (cardType) => CARD_TEMPLATES[cardType];
export const getKeywordMapping = () => KEYWORD_CARD_MAPPING;