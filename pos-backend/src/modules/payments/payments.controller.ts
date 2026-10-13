import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { PaymentsService } from './payments.service.js';

class PromptPayQueryDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10_000_000)
  amount: number;
}

@UseGuards(AuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('promptpay')
  promptPay(@Req() req: { user: AuthenticatedUser }, @Query() query: PromptPayQueryDto) {
    return this.paymentsService.promptPay(requireShopId(req.user), query.amount);
  }
}
