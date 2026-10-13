import { Controller } from '@nestjs/common';
import { ReceiptsService } from './receipts.service.js';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}
}
