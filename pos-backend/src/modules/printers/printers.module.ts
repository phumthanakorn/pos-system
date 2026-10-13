import { Module } from '@nestjs/common';
import { PrintersController } from './printers.controller.js';
import { PrintersService } from './printers.service.js';

@Module({
  controllers: [PrintersController],
  providers: [PrintersService],
  exports: [PrintersService],
})
export class PrintersModule {}
