import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { CashMovementDto } from './dto/cash-movement.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { ShiftsService } from './shifts.service.js';

@UseGuards(AuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('current')
  getCurrent(@Req() req: { user: AuthenticatedUser }) {
    return this.shiftsService.getCurrent(requireShopId(req.user));
  }

  @Roles('owner', 'manager')
  @Get('history')
  history(@Req() req: { user: AuthenticatedUser }, @Query() query: PageQueryDto) {
    return this.shiftsService.history(requireShopId(req.user), query);
  }

  @Roles('owner', 'manager')
  @Get(':id')
  getById(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.shiftsService.getById(requireShopId(req.user), id);
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
