import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { StockReportService } from './stock-report.service.js';
import { MemberReportService } from './member-report.service.js';
import { SalesReportService } from './sales-report.service.js';

@Module({
  controllers: [ReportsController],
  providers: [SalesReportService, StockReportService, MemberReportService],
})
export class ReportsModule {}
