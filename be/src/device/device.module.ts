import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceGateway } from './device.gateway';
import { DeviceController } from './device.controller';

@Module({
  controllers: [DeviceController],
  providers: [DeviceService, DeviceGateway],
  exports: [DeviceService],
})
export class DeviceModule {}
