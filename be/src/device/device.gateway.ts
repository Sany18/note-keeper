import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DeviceService } from './device.service';
import { DeviceInfo, FileTransferRequest, FileTransferResponse, FileChunk } from './device.interface';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: import.meta.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class DeviceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DeviceGateway.name);

  constructor(private deviceService: DeviceService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.deviceService.removeDeviceBySocketId(client.id);
    this.broadcastDeviceUpdate();
  }

  @SubscribeMessage('register-device')
  handleRegisterDevice(
    @MessageBody() data: { userHash: string; deviceInfo: DeviceInfo },
    @ConnectedSocket() client: Socket,
  ) {
    const { userHash, deviceInfo } = data;
    const device = this.deviceService.registerDevice(client.id, userHash, deviceInfo);

    this.logger.log(`Device registered: ${device.id} for user: ${userHash}`);

    // Send device info back to client
    client.emit('device-registered', device);

    // Broadcast updated device list to all devices of this user
    this.broadcastDeviceUpdate(userHash);

    return { success: true, device };
  }

  @SubscribeMessage('get-my-devices')
  handleGetMyDevices(
    @MessageBody() data: { userHash: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userHash } = data;
    const devices = this.deviceService.getOnlineUserDevices(userHash);

    client.emit('my-devices', devices);

    return { success: true, devices };
  }

  @SubscribeMessage('request-file-transfer')
  handleFileTransferRequest(
    @MessageBody() data: FileTransferRequest,
    @ConnectedSocket() client: Socket,
  ) {
    const { toDeviceId, fromDeviceId, fileName, fileSize, fileType, transferId } = data;

    const targetDevice = this.deviceService.getDeviceById(toDeviceId);
    const sourceDevice = this.deviceService.getDeviceById(fromDeviceId);

    if (!targetDevice || !sourceDevice) {
      client.emit('transfer-error', { transferId, message: 'Device not found' });
      return { success: false, message: 'Device not found' };
    }

    // Forward the request to the target device
    this.server.to(targetDevice.socketId).emit('file-transfer-request', {
      transferId,
      fromDeviceId,
      fromDeviceName: sourceDevice.name,
      fileName,
      fileSize,
      fileType,
    });

    this.logger.log(`File transfer request: ${fileName} from ${fromDeviceId} to ${toDeviceId}`);

    return { success: true };
  }

  @SubscribeMessage('file-transfer-response')
  handleFileTransferResponse(
    @MessageBody() data: FileTransferResponse,
    @ConnectedSocket() client: Socket,
  ) {
    const { transferId, accepted, message } = data;

    // Find the source device and notify about the response
    const devices = this.deviceService.getAllOnlineDevices();
    const sourceDevice = devices.find(device =>
      device.socketId !== client.id // Find a different device that might be waiting for this response
    );

    if (sourceDevice) {
      this.server.to(sourceDevice.socketId).emit('file-transfer-response', {
        transferId,
        accepted,
        message,
      });
    }

    this.logger.log(`File transfer response: ${transferId} - ${accepted ? 'accepted' : 'rejected'}`);

    return { success: true };
  }

  @SubscribeMessage('file-chunk')
  handleFileChunk(
    @MessageBody() data: FileChunk,
    @ConnectedSocket() client: Socket,
  ) {
    const { transferId, chunkNumber, totalChunks, data: chunkData, isLast } = data;

    // Find the target device and forward the chunk
    const devices = this.deviceService.getAllOnlineDevices();
    const targetDevice = devices.find(device =>
      device.socketId !== client.id // Find the receiving device
    );

    if (targetDevice) {
      this.server.to(targetDevice.socketId).emit('file-chunk', {
        transferId,
        chunkNumber,
        totalChunks,
        data: chunkData,
        isLast,
      });
    }

    if (isLast) {
      this.logger.log(`File transfer completed: ${transferId}`);
    }

    return { success: true };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const device = this.deviceService.getDeviceBySocketId(client.id);
    if (device) {
      this.deviceService.updateDeviceStatus(device.id, true);
    }

    client.emit('pong');
    return { success: true };
  }

  private broadcastDeviceUpdate(userHash?: string) {
    if (userHash) {
      const devices = this.deviceService.getOnlineUserDevices(userHash);
      devices.forEach(device => {
        this.server.to(device.socketId).emit('devices-updated', devices);
      });
    }
  }
}
