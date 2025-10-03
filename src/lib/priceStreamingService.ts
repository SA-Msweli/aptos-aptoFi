import { EventEmitter } from 'events';
import { getTokenPriceInfo, isPriceFresh, type TokenPriceInfo } from '@/view-functions/getOracleData';

export interface StreamingConfig {
  tokens: string[];
  updateInterval: number; // milliseconds
  maxReconnectAttempts: number;
  reconnectDelay: number; // milliseconds
  heartbeatInterval: number; // milliseconds
}

export interface PriceStreamData {
  tokenSymbol: string;
  price: number;
  priceChange24h: number;
  timestamp: number;
  isFresh: boolean;
  volume24h?: number;
  marketCap?: number;
}

export interface StreamingStatus {
  isConnected: boolean;
  isReconnecting: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
  activeStreams: number;
  totalUpdates: number;
}

export class PriceStreamingService extends EventEmitter {
  private config: StreamingConfig;
  private status: StreamingStatus;
  private streamTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(config: Partial<StreamingConfig> = {}) {
    super();

    this.config = {
      tokens: ['APT', 'USDC', 'USDT', 'BTC', 'ETH'],
      updateInterval: 15000, // 15 seconds for real-time feel
      maxReconnectAttempts: 5,
      reconnectDelay: 3000, // 3 seconds
      heartbeatInterval: 30000, // 30 seconds
      ...config
    };

    this.status = {
      isConnected: false,
      isReconnecting: false,
      lastHeartbeat: 0,
      reconnectAttempts: 0,
      activeStreams: 0,
      totalUpdates: 0
    };

    console.log('📡 Price streaming service initialized');
  }

  public async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Service has been destroyed');
    }

    if (this.status.isConnected) {
      console.warn('⚠️ Already connected to price streaming');
      return;
    }

    try {
      console.log('🔌 Connecting to price streaming...');

      // Start streaming for each token
      await this.startTokenStreams();

      // Start heartbeat
      this.startHeartbeat();

      this.status.isConnected = true;
      this.status.reconnectAttempts = 0;

      console.log('✅ Connected to price streaming');
      this.emit('connected', { timestamp: Date.now() });

    } catch (error) {
      console.error('❌ Failed to connect to price streaming:', error);
      this.emit('error', { type: 'connection', error });
      throw error;
    }
  }

  public disconnect(): void {
    if (!this.status.isConnected) {
      return;
    }

    console.log('🔌 Disconnecting from price streaming...');

    // Stop all streams
    this.stopAllStreams();

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.status.isConnected = false;
    this.status.isReconnecting = false;

    console.log('✅ Disconnected from price streaming');
    this.emit('disconnected', { timestamp: Date.now() });
  }

  private async startTokenStreams(): Promise<void> {
    const streamPromises = this.config.tokens.map(async (tokenSymbol) => {
      try {
        await this.startTokenStream(tokenSymbol);
      } catch (error) {
        console.error(`❌ Failed to start stream for ${tokenSymbol}:`, error);
      }
    });

    await Promise.all(streamPromises);
  }

  private async startTokenStream(tokenSymbol: string): Promise<void> {
    // Clear existing timer if any
    const existingTimer = this.streamTimers.get(tokenSymbol);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Initial price fetch
    await this.fetchAndEmitPrice(tokenSymbol);

    // Set up periodic updates
    const timer = setInterval(async () => {
      if (!this.status.isConnected || this.isDestroyed) {
        return;
      }

      await this.fetchAndEmitPrice(tokenSymbol);
    }, this.config.updateInterval);

    this.streamTimers.set(tokenSymbol, timer);
    this.status.activeStreams++;

    console.log(`📊 Started price stream for ${tokenSymbol}`);
  }

  private async fetchAndEmitPrice(tokenSymbol: string): Promise<void> {
    try {
      const [priceInfo, isFresh] = await Promise.all([
        getTokenPriceInfo(tokenSymbol),
        isPriceFresh(tokenSymbol)
      ]);

      const streamData: PriceStreamData = {
        tokenSymbol,
        price: priceInfo.priceUSD,
        priceChange24h: priceInfo.priceChange24h,
        timestamp: Date.now(),
        isFresh,
        // Mock additional data that might come from a real streaming service
        volume24h: this.generateMockVolume(priceInfo.priceUSD),
        marketCap: this.generateMockMarketCap(priceInfo.priceUSD)
      };

      this.status.totalUpdates++;
      this.emit('priceUpdate', streamData);

      // Emit specific token events
      this.emit(`price:${tokenSymbol}`, streamData);

      // Check for significant price changes
      this.checkPriceMovement(streamData);

    } catch (error) {
      console.error(`❌ Failed to fetch price for ${tokenSymbol}:`, error);
      this.emit('error', {
        type: 'price_fetch',
        tokenSymbol,
        error
      });

      // Attempt reconnection if too many errors
      await this.handleStreamError(tokenSymbol, error);
    }
  }

  private generateMockVolume(price: number): number {
    // Generate realistic-looking volume data
    const baseVolume = Math.random() * 1000000 + 100000;
    return Math.round(baseVolume * (price / 10));
  }

  private generateMockMarketCap(price: number): number {
    // Generate realistic-looking market cap data
    const baseMarketCap = Math.random() * 10000000000 + 1000000000;
    return Math.round(baseMarketCap * (price / 100));
  }

  private checkPriceMovement(data: PriceStreamData): void {
    const { tokenSymbol, priceChange24h } = data;

    // Emit alerts for significant price movements
    if (Math.abs(priceChange24h) >= 5) { // 5% or more change
      this.emit('significantPriceMovement', {
        tokenSymbol,
        priceChange24h,
        timestamp: data.timestamp,
        type: priceChange24h > 0 ? 'surge' : 'drop'
      });
    }

    // Emit volatility alerts
    if (Math.abs(priceChange24h) >= 10) { // 10% or more change
      this.emit('highVolatility', {
        tokenSymbol,
        priceChange24h,
        timestamp: data.timestamp
      });
    }
  }

  private async handleStreamError(tokenSymbol: string, error: any): Promise<void> {
    console.error(`❌ Stream error for ${tokenSymbol}:`, error);

    // Stop the problematic stream
    const timer = this.streamTimers.get(tokenSymbol);
    if (timer) {
      clearInterval(timer);
      this.streamTimers.delete(tokenSymbol);
      this.status.activeStreams--;
    }

    // Attempt to restart the stream after a delay
    setTimeout(async () => {
      if (this.status.isConnected && !this.isDestroyed) {
        try {
          await this.startTokenStream(tokenSymbol);
          console.log(`✅ Restarted stream for ${tokenSymbol}`);
        } catch (restartError) {
          console.error(`❌ Failed to restart stream for ${tokenSymbol}:`, restartError);
        }
      }
    }, this.config.reconnectDelay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isDestroyed) {
        return;
      }

      this.status.lastHeartbeat = Date.now();
      this.emit('heartbeat', {
        timestamp: this.status.lastHeartbeat,
        activeStreams: this.status.activeStreams,
        totalUpdates: this.status.totalUpdates
      });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private stopAllStreams(): void {
    for (const [tokenSymbol, timer] of this.streamTimers.entries()) {
      clearInterval(timer);
      console.log(`🛑 Stopped stream for ${tokenSymbol}`);
    }

    this.streamTimers.clear();
    this.status.activeStreams = 0;
  }

  // Public API methods
  public addToken(tokenSymbol: string): void {
    if (this.config.tokens.includes(tokenSymbol)) {
      console.warn(`⚠️ Token ${tokenSymbol} is already being streamed`);
      return;
    }

    this.config.tokens.push(tokenSymbol);

    if (this.status.isConnected) {
      this.startTokenStream(tokenSymbol).catch(error => {
        console.error(`❌ Failed to add token stream for ${tokenSymbol}:`, error);
      });
    }

    console.log(`➕ Added ${tokenSymbol} to streaming list`);
  }

  public removeToken(tokenSymbol: string): void {
    const index = this.config.tokens.indexOf(tokenSymbol);
    if (index === -1) {
      console.warn(`⚠️ Token ${tokenSymbol} is not being streamed`);
      return;
    }

    // Remove from config
    this.config.tokens.splice(index, 1);

    // Stop the stream
    const timer = this.streamTimers.get(tokenSymbol);
    if (timer) {
      clearInterval(timer);
      this.streamTimers.delete(tokenSymbol);
      this.status.activeStreams--;
    }

    console.log(`➖ Removed ${tokenSymbol} from streaming list`);
  }

  public getStatus(): StreamingStatus {
    return { ...this.status };
  }

  public getActiveTokens(): string[] {
    return [...this.config.tokens];
  }

  public updateConfig(newConfig: Partial<StreamingConfig>): void {
    const oldTokens = [...this.config.tokens];
    this.config = { ...this.config, ...newConfig };

    // Handle token list changes
    if (newConfig.tokens && this.status.isConnected) {
      // Stop streams for removed tokens
      const removedTokens = oldTokens.filter(token => !this.config.tokens.includes(token));
      removedTokens.forEach(token => this.removeToken(token));

      // Start streams for new tokens
      const newTokens = this.config.tokens.filter(token => !oldTokens.includes(token));
      newTokens.forEach(token => this.addToken(token));
    }

    console.log('⚙️ Updated streaming configuration');
  }

  public async reconnect(): Promise<void> {
    if (this.status.isReconnecting) {
      console.warn('⚠️ Already attempting to reconnect');
      return;
    }

    if (this.status.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.status.isReconnecting = true;
    this.status.reconnectAttempts++;

    console.log(`🔄 Attempting to reconnect (${this.status.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

    try {
      this.disconnect();
      await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay));
      await this.connect();

      this.status.isReconnecting = false;
      console.log('✅ Reconnection successful');
      this.emit('reconnected');

    } catch (error) {
      this.status.isReconnecting = false;
      console.error('❌ Reconnection failed:', error);
      this.emit('reconnectFailed', { error, attempt: this.status.reconnectAttempts });

      // Schedule next reconnection attempt
      if (this.status.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnect();
        }, this.config.reconnectDelay * this.status.reconnectAttempts); // Exponential backoff
      }
    }
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    console.log('🧹 Destroying price streaming service...');

    this.isDestroyed = true;
    this.disconnect();
    this.removeAllListeners();

    console.log('✅ Price streaming service destroyed');
  }
}

// Singleton instance
let streamingServiceInstance: PriceStreamingService | null = null;

export const getPriceStreamingService = (config?: Partial<StreamingConfig>): PriceStreamingService => {
  if (!streamingServiceInstance) {
    streamingServiceInstance = new PriceStreamingService(config);
  }
  return streamingServiceInstance;
};

export const destroyPriceStreamingService = (): void => {
  if (streamingServiceInstance) {
    streamingServiceInstance.destroy();
    streamingServiceInstance = null;
  }
};