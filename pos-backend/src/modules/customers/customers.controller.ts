import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { AdjustPointsDto, CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto.js';
import { CustomersService } from './customers.service.js';

type Req_ = { user: AuthenticatedUser };

// Cashiers may look members up and sign new ones up at the counter; editing, deleting and
// adjusting points is for owner/manager.
@UseGuards(AuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@Req() req: Req_, @Query() query: PageQueryDto) {
    return this.customersService.list(requireShopId(req.user), query);
  }

  @Roles('owner', 'manager')
  @Post('recalculate-points')
  recalculateAll(@Req() req: Req_) {
    return this.customersService.recalculatePoints(requireShopId(req.user));
  }

  @Roles('owner', 'manager')
  @Post(':id/recalculate-points')
  recalculateOne(@Req() req: Req_, @Param('id', ParseIntPipe) id: number) {
    return this.customersService.recalculatePoints(requireShopId(req.user), id);
  }

  @Get(':id')
  detail(@Req() req: Req_, @Param('id', ParseIntPipe) id: number) {
    return this.customersService.detail(requireShopId(req.user), id);
  }

  @Post()
  create(@Req() req: Req_, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(requireShopId(req.user), dto);
  }

  @Roles('owner', 'manager')
  @Patch(':id')
  update(@Req() req: Req_, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(requireShopId(req.user), id, dto);
  }

  @Roles('owner', 'manager')
  @Post(':id/points')
  adjustPoints(@Req() req: Req_, @Param('id', ParseIntPipe) id: number, @Body() dto: AdjustPointsDto) {
    return this.customersService.adjustPoints(requireShopId(req.user), id, dto);
  }

  @Roles('owner', 'manager')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: Req_, @Param('id', ParseIntPipe) id: number) {
    await this.customersService.remove(requireShopId(req.user), id);
  }
}
