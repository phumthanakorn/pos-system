import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { CashMovementDto } from './dto/cash-movement.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { ShiftsService } from './shifts.service.js';

@UseGuards(AuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('current')
  getCurrent(@Req() req: { user: AuthenticatedUser }) {
    return this.shiftsService.getCurrent(requireShopId(req.user));
  }

  @Post('open')
  open(@Req() req: { user: AuthenticatedUser }, @Body() dto: OpenShiftDto) {
    return this.shiftsService.open(requireShopId(req.user), req.user.id, dto);
  }

  @Post('cash-movements')
  addCashMovement(@Req() req: { user: AuthenticatedUser }, @Body() dto: CashMovementDto) {
    return this.shiftsService.addCashMovement(requireShopId(req.user), req.user.id, dto);
  }

  @Post('close')
  close(@Req() req: { user: AuthenticatedUser }, @Body() dto: CloseShiftDto) {
    return this.shiftsService.close(requireShopId(req.user), req.user, dto);
  }
}
