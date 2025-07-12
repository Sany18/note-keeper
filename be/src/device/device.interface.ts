export interface Device {
  id: string;
  userHash: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'other';
  os: string;
  browser: string;
  lastSeen: Date;
  isOnline: boolean;
  socketId: string;
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
  fromDeviceId: string;
  toDeviceId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  transferId: string;
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
  data: Buffer;
  isLast: boolean;
}
