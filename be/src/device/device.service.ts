import { Injectable } from '@nestjs/common';
import { Device, DeviceInfo } from './device.interface';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

@Injectable()
export class DeviceService {
  private devices: Map<string, Device> = new Map();
  private userDevices: Map<string, Set<string>> = new Map();

  generateUserHash(userInfo: any): string {
    // Generate hash from user info similar to frontend
    const userString = JSON.stringify({
      email: userInfo?.email,
      id: userInfo?.id,
      name: userInfo?.name,
    });
    return createHash('sha256').update(userString).digest('hex');
  }

  registerDevice(socketId: string, userHash: string, deviceInfo: DeviceInfo): Device {
    const device: Device = {
      id: uuidv4(),
      userHash,
      socketId,
      name: deviceInfo.name,
      type: deviceInfo.type,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      lastSeen: new Date(),
      isOnline: true,
      capabilities: deviceInfo.capabilities,
    };

    this.devices.set(device.id, device);

    // Add device to user's device list
    if (!this.userDevices.has(userHash)) {
      this.userDevices.set(userHash, new Set());
    }
    this.userDevices.get(userHash)?.add(device.id);

    return device;
  }

  updateDeviceStatus(deviceId: string, isOnline: boolean): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isOnline = isOnline;
      device.lastSeen = new Date();
      this.devices.set(deviceId, device);
    }
  }

  getDeviceBySocketId(socketId: string): Device | undefined {
    return Array.from(this.devices.values()).find(device => device.socketId === socketId);
  }

  getDeviceById(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  getUserDevices(userHash: string): Device[] {
    const deviceIds = this.userDevices.get(userHash);
    if (!deviceIds) return [];

    return Array.from(deviceIds)
      .map(id => this.devices.get(id))
      .filter(device => device !== undefined) as Device[];
  }

  getOnlineUserDevices(userHash: string): Device[] {
    return this.getUserDevices(userHash).filter(device => device.isOnline);
  }

  removeDevice(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.delete(deviceId);
      this.userDevices.get(device.userHash)?.delete(deviceId);
    }
  }

  removeDeviceBySocketId(socketId: string): void {
    const device = this.getDeviceBySocketId(socketId);
    if (device) {
      this.removeDevice(device.id);
    }
  }

  getAllOnlineDevices(): Device[] {
    return Array.from(this.devices.values()).filter(device => device.isOnline);
  }

  cleanupOfflineDevices(maxOfflineTime: number = 30 * 60 * 1000): void {
    const now = new Date();
    const devicesToRemove: string[] = [];

    this.devices.forEach((device, id) => {
      if (!device.isOnline && (now.getTime() - device.lastSeen.getTime()) > maxOfflineTime) {
        devicesToRemove.push(id);
      }
    });

    devicesToRemove.forEach(id => this.removeDevice(id));
  }
}
