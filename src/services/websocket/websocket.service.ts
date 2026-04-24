import { io, Socket } from 'socket.io-client';

export interface Device {
  id: string;
  userHash: string;
  socketId: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'other';
  os: string;
  browser: string;
  lastSeen: Date;
  isOnline: boolean;
  capabilities: {
    canSendFiles: boolean;
    canReceiveFiles: boolean;
    maxFileSize: number;
  };
}

export interface DeviceInfo {
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'other';
  os: string;
  browser: string;
  capabilities: {
    canSendFiles: boolean;
    canReceiveFiles: boolean;
    maxFileSize: number;
  };
}

export interface FileTransferRequest {
  transferId: string;
  fromDeviceId: string;
  toDeviceId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface FileTransferResponse {
  transferId: string;
  accepted: boolean;
  message?: string;
}

export interface FileChunk {
  transferId: string;
  chunkNumber: number;
  totalChunks: number;
  data: string; // Base64 encoded chunk data
  isLast: boolean;
}

export type WebSocketEventCallbacks = {
  'device-registered': (device: Device) => void;
  'my-devices': (devices: Device[]) => void;
  'devices-updated': (devices: Device[]) => void;
  'file-transfer-request': (request: any) => void;
  'file-transfer-response': (response: FileTransferResponse) => void;
  'file-chunk': (chunk: FileChunk) => void;
  'transfer-error': (error: { transferId: string; message: string }) => void;
  'pong': () => void;
};

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private eventCallbacks: Map<string, Function[]> = new Map();

  connect(url: string = import.meta.env.VITE_WS_URL || 'http://localhost:3001'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(url, {
          transports: ['websocket'],
          autoConnect: true,
        });

        this.socket.on('connect', () => {
          console.log('Connected to WebSocket server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from WebSocket server');
          this.isConnected = false;
          this.handleReconnect();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnected = false;
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
          this.handleReconnect();
        });

        // Set up event listeners
        this.setupEventListeners();

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    const events: (keyof WebSocketEventCallbacks)[] = [
      'device-registered',
      'my-devices',
      'devices-updated',
      'file-transfer-request',
      'file-transfer-response',
      'file-chunk',
      'transfer-error',
      'pong',
    ];

    events.forEach(event => {
      this.socket?.on(event, (data) => {
        this.triggerCallbacks(event, data);
      });
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.socket?.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  on<T extends keyof WebSocketEventCallbacks>(
    event: T,
    callback: WebSocketEventCallbacks[T]
  ): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)?.push(callback);
  }

  off<T extends keyof WebSocketEventCallbacks>(
    event: T,
    callback: WebSocketEventCallbacks[T]
  ): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private triggerCallbacks(event: string, data: any) {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Cannot emit event:', event);
    }
  }

  registerDevice(userHash: string, deviceInfo: DeviceInfo): void {
    this.emit('register-device', { userHash, deviceInfo });
  }

  getMyDevices(userHash: string): void {
    this.emit('get-my-devices', { userHash });
  }

  requestFileTransfer(request: FileTransferRequest): void {
    this.emit('request-file-transfer', request);
  }

  respondToFileTransfer(response: FileTransferResponse): void {
    this.emit('file-transfer-response', response);
  }

  sendFileChunk(chunk: FileChunk): void {
    this.emit('file-chunk', chunk);
  }

  ping(): void {
    this.emit('ping');
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // Detect device type
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = /iPad/i.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detect OS
    let os = 'Unknown';
    if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/MacOS|Mac OS|Mac/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';
    else if (/Android/i.test(userAgent)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS';

    // Detect browser
    let browser = 'Unknown';
    if (/Chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Safari/i.test(userAgent)) browser = 'Safari';
    else if (/Edge/i.test(userAgent)) browser = 'Edge';

    // Basic capabilities
    const capabilities = {
      canSendFiles: true,
      canReceiveFiles: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    };

    return {
      name: `${os} ${browser}`,
      type: deviceType,
      os,
      browser,
      capabilities,
    };
  }
}

export const webSocketService = new WebSocketService();
