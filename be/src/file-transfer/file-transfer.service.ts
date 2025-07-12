import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface FileTransfer {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'pending' | 'accepted' | 'rejected' | 'transferring' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  progress: number;
  chunks: Map<number, Buffer>;
  totalChunks: number;
}

@Injectable()
export class FileTransferService {
  private transfers: Map<string, FileTransfer> = new Map();

  createTransfer(
    fromDeviceId: string,
    toDeviceId: string,
    fileName: string,
    fileSize: number,
    fileType: string,
  ): FileTransfer {
    const transfer: FileTransfer = {
      id: uuidv4(),
      fromDeviceId,
      toDeviceId,
      fileName,
      fileSize,
      fileType,
      status: 'pending',
      createdAt: new Date(),
      progress: 0,
      chunks: new Map(),
      totalChunks: 0,
    };

    this.transfers.set(transfer.id, transfer);
    return transfer;
  }

  getTransfer(transferId: string): FileTransfer | undefined {
    return this.transfers.get(transferId);
  }

  updateTransferStatus(transferId: string, status: FileTransfer['status']): void {
    const transfer = this.transfers.get(transferId);
    if (transfer) {
      transfer.status = status;
      if (status === 'completed' || status === 'failed') {
        transfer.completedAt = new Date();
      }
      this.transfers.set(transferId, transfer);
    }
  }

  addChunk(transferId: string, chunkNumber: number, chunkData: Buffer): void {
    const transfer = this.transfers.get(transferId);
    if (transfer) {
      transfer.chunks.set(chunkNumber, chunkData);
      transfer.progress = (transfer.chunks.size / transfer.totalChunks) * 100;
      this.transfers.set(transferId, transfer);
    }
  }

  setTotalChunks(transferId: string, totalChunks: number): void {
    const transfer = this.transfers.get(transferId);
    if (transfer) {
      transfer.totalChunks = totalChunks;
      this.transfers.set(transferId, transfer);
    }
  }

  getCompleteFile(transferId: string): Buffer | null {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.status !== 'completed') {
      return null;
    }

    const chunks: Buffer[] = [];
    for (let i = 0; i < transfer.totalChunks; i++) {
      const chunk = transfer.chunks.get(i);
      if (!chunk) {
        return null; // Missing chunk
      }
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  getDeviceTransfers(deviceId: string): FileTransfer[] {
    return Array.from(this.transfers.values()).filter(
      transfer => transfer.fromDeviceId === deviceId || transfer.toDeviceId === deviceId
    );
  }

  cleanupOldTransfers(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    const transfersToDelete: string[] = [];

    this.transfers.forEach((transfer, id) => {
      const age = now.getTime() - transfer.createdAt.getTime();
      if (age > maxAge && (transfer.status === 'completed' || transfer.status === 'failed')) {
        transfersToDelete.push(id);
      }
    });

    transfersToDelete.forEach(id => this.transfers.delete(id));
  }

  removeTransfer(transferId: string): void {
    this.transfers.delete(transferId);
  }
}
