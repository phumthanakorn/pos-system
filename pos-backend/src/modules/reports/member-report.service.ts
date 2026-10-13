import { BadRequestException, Injectable } from '@nestjs/common';
import { round2 } from '../../common/helpers/money.js';
import { parseReportRange, type ReportRange } from '../../common/helpers/report-range.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const TOP_CUSTOMERS = 10;

@Injectable()
export class MemberReportService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(shopId: number, from?: string, to?: string) {
    let range: ReportRange;
    try {
      range = parseReportRange(from, to);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'ช่วงวันที่ไม่ถูกต้อง');
    }
    const inRange = { gte: range.start, lt: range.endExclusive };
    const paidBase = { shopId, status: 'paid' as const, createdAt: inRange };

    const [memberAgg, nonMemberAgg, pointRows, newMembers, totalMembers, topCustomers] = await Promise.all([
      this.prisma.order.aggregate({ where: { ...paidBase, customerId: { not: null } }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.order.aggregate({ where: { ...paidBase, customerId: null }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.pointTransaction.groupBy({
        by: ['type'],
        where: { shopId, createdAt: inRange },
        _sum: { points: true },
      }),
      this.prisma.customer.count({ where: { shopId, createdAt: inRange } }),
      this.prisma.customer.count({ where: { shopId } }),
      this.prisma.$queryRaw<{ customer_id: number; name: string; bill_count: bigint; total: unknown }[]>`
        SELECT o.customer_id AS customer_id, c.name AS name, COUNT(*) AS bill_count, SUM(o.total) AS total
        FROM orders o JOIN customers c ON c.id = o.customer_id
        WHERE o.shop_id = ${shopId} AND o.status = 'paid' AND o.customer_id IS NOT NULL
          AND o.created_at >= ${range.start} AND o.created_at < ${range.endExclusive}
        GROUP BY o.customer_id, c.name
        ORDER BY total DESC
        LIMIT ${TOP_CUSTOMERS}`,
    ]);

    const pointsByType = { earn: 0, redeem: 0, reverse_earn: 0, refund_redeem: 0, adjust: 0 };
    for (const row of pointRows) {
      pointsByType[row.type] = Number(row._sum.points ?? 0);
    }
    const memberTotal = round2(Number(memberAgg._sum.total ?? 0));
    const nonMemberTotal = round2(Number(nonMemberAgg._sum.total ?? 0));
    const billTotal = memberAgg._count._all + nonMemberAgg._count._all;

    return {
      from: range.from,
      to: range.to,
      memberSales: { total: memberTotal, billCount: memberAgg._count._all },
      nonMemberSales: { total: nonMemberTotal, billCount: nonMemberAgg._count._all },
      memberSharePercent: billTotal ? round2((memberAgg._count._all / billTotal) * 100) : 0,
      pointsIssued: pointsByType.earn,
      pointsRedeemed: Math.abs(pointsByType.redeem),
      pointsReversed: Math.abs(pointsByType.reverse_earn) + pointsByType.refund_redeem,
      pointsAdjusted: pointsByType.adjust,
      newMembers,
      totalMembers,
      topCustomers: topCustomers.map((c) => ({
        customerId: c.customer_id,
        name: c.name,
        billCount: Number(c.bill_count),
        total: round2(Number(c.total)),
      })),
    };
  }
}
