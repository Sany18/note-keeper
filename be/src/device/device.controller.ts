import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceInfo } from './device.interface';

@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get('user/:userHash')
  getUserDevices(@Param('userHash') userHash: string) {
    try {
      const devices = this.deviceService.getUserDevices(userHash);
      return {
        success: true,
        devices,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get user devices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userHash/online')
  getOnlineUserDevices(@Param('userHash') userHash: string) {
    try {
      const devices = this.deviceService.getOnlineUserDevices(userHash);
      return {
        success: true,
        devices,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get online user devices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('online')
  getAllOnlineDevices() {
    try {
      const devices = this.deviceService.getAllOnlineDevices();
      return {
        success: true,
        devices,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get online devices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-hash')
  generateUserHash(@Body() userInfo: any) {
    try {
      const hash = this.deviceService.generateUserHash(userInfo);
      return {
        success: true,
        hash,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to generate user hash',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
