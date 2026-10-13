import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { PayOrderDto } from './dto/pay-order.dto.js';
import { VoidOrderDto } from './dto/void-order.dto.js';
import { OrdersService } from './orders.service.js';

@UseGuards(AuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Req() req: { user: AuthenticatedUser }, @Query() query: ListOrdersDto) {
    return this.ordersService.list(requireShopId(req.user), query);
  }

  @Post()
  create(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(requireShopId(req.user), req.user, dto);
  }

  @Roles('owner', 'manager')
  @Post(':id/void')
  void(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VoidOrderDto,
  ) {
    return this.ordersService.void(requireShopId(req.user), req.user.id, id, dto.reason);
  }

  @Post(':id/discard')
  discard(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.discardOpen(requireShopId(req.user), id);
  }

  @Post(':id/pay')
  pay(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayOrderDto,
  ) {
    return this.ordersService.pay(requireShopId(req.user), id, dto);
  }
}
