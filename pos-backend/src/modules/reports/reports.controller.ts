import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { StockReportService } from './stock-report.service.js';
import { MemberReportService } from './member-report.service.js';
import { SalesReportQueryDto } from './dto/sales-report.dto.js';
import { SalesReportService } from './sales-report.service.js';

@UseGuards(AuthGuard, RolesGuard)
@Roles('owner', 'manager')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly salesReportService: SalesReportService,
    private readonly stockReportService: StockReportService,
    private readonly memberReportService: MemberReportService,
  ) {}

  @Get('sales')
  sales(@Req() req: { user: AuthenticatedUser }, @Query() query: SalesReportQueryDto) {
    return this.salesReportService.summary(requireShopId(req.user), query.from, query.to);
  }

  @Get('stock')
  stock(@Req() req: { user: AuthenticatedUser }, @Query() query: SalesReportQueryDto) {
    return this.stockReportService.summary(requireShopId(req.user), query.from, query.to);
  }

  @Get('members')
  members(@Req() req: { user: AuthenticatedUser }, @Query() query: SalesReportQueryDto) {
    return this.memberReportService.summary(requireShopId(req.user), query.from, query.to);
  }
}
