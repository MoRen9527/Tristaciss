interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

interface SystemPrompts {
  mode: 'unified' | 'individual';
  prompt?: string;
  prompts?: Record<string, string>;
}

interface WebSocketManagerOptions {
  url?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
}

class WebSocketManager {
  private url: string;
  private onConnect: () => void;
  private onDisconnect: () => void;
  private onMessage: (message: any) => void;
  private onError: (error: any) => void;
  
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(options: WebSocketManagerOptions = {}) {
    this.url = options.url || this.getWebSocketUrl();
    this.onConnect = options.onConnect || (() => {});
    this.onDisconnect = options.onDisconnect || (() => {});
    this.onMessage = options.onMessage || (() => {});
    this.onError = options.onError || (() => {});
  }

  private getWebSocketUrl(): string {
    // 获取当前的API基础URL
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8008/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    
    // 转换为WebSocket URL
    const wsUrl = baseUrl.replace(/^http/, 'ws');
    return `${wsUrl}/ws/group-chat`;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    try {
      console.log('正在连接WebSocket:', this.url);
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket连接成功');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.onConnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('收到WebSocket消息:', message);
          this.onMessage(message);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error, '原始数据:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket连接关闭:', event.code, event.reason);
        this.isConnecting = false;
        this.onDisconnect();
        
        // 自动重连
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
          console.log(`${delay}ms后尝试重连 (第${this.reconnectAttempts + 1}次)`);
          
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('达到最大重连次数，停止重连');
          this.onError(new Error('WebSocket连接失败，已达到最大重连次数'));
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        this.isConnecting = false;
        this.onError(error);
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('创建WebSocket连接失败:', error);
      this.onError(error);
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    
    if (this.ws) {
      console.log('主动断开WebSocket连接');
      this.ws.close();
      this.ws = null;
    }
  }

  async initializeGroupChat(models: ModelInfo[], systemPrompts: SystemPrompts): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket未连接');
    }

    const message = {
      type: 'initialize_group_chat',
      data: {
        models: models.map(m => ({
          id: m.id,
          name: m.name,
          provider: m.provider
        })),
        systemPrompts
      }
    };

    console.log('发送初始化群聊消息:', message);
    this.ws.send(JSON.stringify(message));
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket未连接');
    }

    const message = {
      type: 'user_message',
      data: {
        content,
        timestamp: new Date().toISOString()
      }
    };

    console.log('发送用户消息:', message);
    this.ws.send(JSON.stringify(message));
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
}

export default WebSocketManager;