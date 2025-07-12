import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeviceModule } from './device/device.module';
import { FileTransferModule } from './file-transfer/file-transfer.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static/',
    }),
    DeviceModule,
    FileTransferModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
