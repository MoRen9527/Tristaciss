// 汇率服务 - 从后端API获取汇率以确保一致性
interface BackendExchangeRateResponse {
  success: boolean;
  rate: number;
  currency_pair: string;
  timestamp: number;
  error?: string;
  message?: string;
  source?: string;
}

class ExchangeRateService {
  private static instance: ExchangeRateService;
  private usdToCnyRate: number = 7.2; // 默认汇率
  private lastUpdateTime: number = 0;
  private updateInterval: number = 60 * 60 * 1000; // 1小时更新一次

  private constructor() {
    this.initializeRate();
  }

  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  private async initializeRate() {
    // 从localStorage获取缓存的汇率
    const cachedRate = localStorage.getItem('usd_to_cny_rate');
    const cachedTime = localStorage.getItem('usd_to_cny_rate_time');
    
    if (cachedRate && cachedTime) {
      const timeDiff = Date.now() - parseInt(cachedTime);
      if (timeDiff < this.updateInterval) {
        this.usdToCnyRate = parseFloat(cachedRate);
        this.lastUpdateTime = parseInt(cachedTime);
        return;
      }
    }

    // 从后端获取最新汇率
    await this.fetchLatestRate();
  }

  private async fetchLatestRate(): Promise<void> {
    try {
      // 从后端API获取汇率，确保与后端计算一致
      const baseUrl = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${baseUrl}/exchange-rate`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BackendExchangeRateResponse = await response.json();
      
      if (data.rate && data.rate > 0) {
        this.usdToCnyRate = data.rate;
        this.lastUpdateTime = Date.now();
        
        // 缓存到localStorage
        localStorage.setItem('usd_to_cny_rate', this.usdToCnyRate.toString());
        localStorage.setItem('usd_to_cny_rate_time', this.lastUpdateTime.toString());
        
        console.log(`汇率更新成功 (后端API): 1 USD = ${this.usdToCnyRate} CNY`);
        
        if (!data.success) {
          console.warn('后端汇率API警告:', data.message);
        }
      } else {
        throw new Error('后端返回的汇率数据无效');
      }
    } catch (error) {
      console.warn('从后端获取汇率失败，使用默认汇率:', error);
      
      // 如果后端API失败，尝试获取缓存的汇率
      try {
        const baseUrl = process.env.REACT_APP_API_URL || '/api';
        const cacheResponse = await fetch(`${baseUrl}/exchange-rate/current`);
        if (cacheResponse.ok) {
          const cacheData: BackendExchangeRateResponse = await cacheResponse.json();
          if (cacheData.rate && cacheData.rate > 0) {
            this.usdToCnyRate = cacheData.rate;
            this.lastUpdateTime = Date.now();
            console.log(`使用后端缓存汇率: 1 USD = ${this.usdToCnyRate} CNY`);
            return;
          }
        }
      } catch (cacheError) {
        console.warn('获取后端缓存汇率也失败:', cacheError);
      }
    }
  }

  public async getUsdToCnyRate(): Promise<number> {
    // 检查是否需要更新汇率
    const timeDiff = Date.now() - this.lastUpdateTime;
    if (timeDiff > this.updateInterval) {
      await this.fetchLatestRate();
    }
    
    return this.usdToCnyRate;
  }

  public getCurrentRate(): number {
    return this.usdToCnyRate;
  }

  public async forceUpdate(): Promise<number> {
    await this.fetchLatestRate();
    return this.usdToCnyRate;
  }
}

// 导出单例实例
export const exchangeRateService = ExchangeRateService.getInstance();

// 导出便捷函数
export const getUsdToCnyRate = () => exchangeRateService.getCurrentRate();
export const updateExchangeRate = () => exchangeRateService.forceUpdate();