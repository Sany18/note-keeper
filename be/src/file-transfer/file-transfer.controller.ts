import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { FileTransferService } from './file-transfer.service';

@Controller('file-transfers')
export class FileTransferController {
  constructor(private readonly fileTransferService: FileTransferService) {}

  @Get(':transferId')
  getTransfer(@Param('transferId') transferId: string) {
    try {
      const transfer = this.fileTransferService.getTransfer(transferId);
      if (!transfer) {
        throw new HttpException('Transfer not found', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        transfer: {
          ...transfer,
          chunks: undefined, // Don't expose chunks in API
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get transfer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('device/:deviceId')
  getDeviceTransfers(@Param('deviceId') deviceId: string) {
    try {
      const transfers = this.fileTransferService.getDeviceTransfers(deviceId);
      return {
        success: true,
        transfers: transfers.map(transfer => ({
          ...transfer,
          chunks: undefined, // Don't expose chunks in API
        })),
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get device transfers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':transferId/status')
  updateTransferStatus(
    @Param('transferId') transferId: string,
    @Body() body: { status: string },
  ) {
    try {
      const validStatuses = ['pending', 'accepted', 'rejected', 'transferring', 'completed', 'failed'];
      if (!validStatuses.includes(body.status)) {
        throw new HttpException('Invalid status', HttpStatus.BAD_REQUEST);
      }

      this.fileTransferService.updateTransferStatus(transferId, body.status as any);
      return {
        success: true,
        message: 'Transfer status updated',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to update transfer status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup')
  cleanupOldTransfers(@Body() body: { maxAge?: number }) {
    try {
      this.fileTransferService.cleanupOldTransfers(body.maxAge);
      return {
        success: true,
        message: 'Old transfers cleaned up',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to cleanup transfers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
