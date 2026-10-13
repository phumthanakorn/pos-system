import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { DiscountsPromotionsService } from './discounts-promotions.service.js';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto.js';

@UseGuards(AuthGuard, RolesGuard)
@Controller('discounts')
export class DiscountsPromotionsController {
  constructor(private readonly service: DiscountsPromotionsService) {}

  @Roles('owner', 'manager')
  @Get()
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.service.list(requireShopId(req.user));
  }

  @Get('usable')
  usable(@Req() req: { user: AuthenticatedUser }) {
    return this.service.listUsable(requireShopId(req.user), req.user.role);
  }

  @Roles('owner', 'manager')
  @Post()
  create(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateDiscountDto) {
    return this.service.create(requireShopId(req.user), dto);
  }

  @Roles('owner', 'manager')
  @Patch(':id')
  update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDiscountDto,
  ) {
    return this.service.update(requireShopId(req.user), id, dto);
  }

  @Roles('owner', 'manager')
  @Delete(':id')
  remove(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(requireShopId(req.user), id);
  }
}
