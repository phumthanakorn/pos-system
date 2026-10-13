import { Module } from '@nestjs/common';
import { DiscountsPromotionsController } from './discounts-promotions.controller.js';
import { DiscountsPromotionsService } from './discounts-promotions.service.js';

@Module({
  controllers: [DiscountsPromotionsController],
  providers: [DiscountsPromotionsService],
  exports: [DiscountsPromotionsService],
})
export class DiscountsPromotionsModule {}
