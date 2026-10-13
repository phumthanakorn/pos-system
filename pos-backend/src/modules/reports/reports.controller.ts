import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { SalesReportQueryDto } from './dto/sales-report.dto.js';
import { SalesReportService } from './sales-report.service.js';

@UseGuards(AuthGuard, RolesGuard)
@Roles('owner', 'manager')
@Controller('reports')
export class ReportsController {
  constructor(private readonly salesReportService: SalesReportService) {}

  @Get('sales')
  sales(@Req() req: { user: AuthenticatedUser }, @Query() query: SalesReportQueryDto) {
    return this.salesReportService.summary(requireShopId(req.user), query.from, query.to);
  }
}
