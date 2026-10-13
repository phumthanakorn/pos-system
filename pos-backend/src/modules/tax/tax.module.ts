import { Module } from '@nestjs/common';
import { TaxService } from './tax.service.js';

@Module({
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
