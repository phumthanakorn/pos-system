import { BadRequestException, Injectable } from '@nestjs/common';
import { round2 } from '../../common/helpers/money.js';
import { fillDailySeries, parseReportRange, type ReportRange } from '../../common/helpers/report-range.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const TOP_PRODUCTS = 10;

@Injectable()
export class SalesReportService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(shopId: number, from?: string, to?: string) {
    let range: ReportRange;
    try {
      range = parseReportRange(from, to);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'ช่วงวันที่ไม่ถูกต้อง');
    }
    const inRange = { gte: range.start, lt: range.endExclusive };

    const [paid, cancelled, byMethod, daily, top] = await Promise.all([
      this.prisma.order.aggregate({
        where: { shopId, status: 'paid', createdAt: inRange },
        _sum: { subtotal: true, discount: true, tax: true, total: true },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { shopId, status: 'cancelled', voidedAt: { not: null }, createdAt: inRange },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { order: { shopId, status: 'paid', createdAt: inRange } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      // Thailand has no DST, so shifting by a fixed 7 hours gives the Bangkok calendar day
      this.prisma.$queryRaw<{ day: string; total: unknown; cnt: bigint }[]>`
        SELECT DATE_FORMAT(DATE_ADD(created_at, INTERVAL 7 HOUR), '%Y-%m-%d') AS day,
               SUM(total) AS total, COUNT(*) AS cnt
        FROM orders
        WHERE shop_id = ${shopId} AND status = 'paid'
          AND created_at >= ${range.start} AND created_at < ${range.endExclusive}
        GROUP BY day`,
      this.prisma.$queryRaw<{ product_id: number; name: string; qty: unknown; revenue: unknown }[]>`
        SELECT p.id AS product_id, p.name AS name, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE o.shop_id = ${shopId} AND o.status = 'paid'
          AND o.created_at >= ${range.start} AND o.created_at < ${range.endExclusive}
        GROUP BY p.id, p.name
        ORDER BY revenue DESC, qty DESC
        LIMIT ${TOP_PRODUCTS}`,
    ]);

    const billCount = paid._count._all;
    const netSales = round2(Number(paid._sum.total ?? 0));
    const methods = { cash: 0, card: 0, qr: 0 };
    for (const row of byMethod) {
      methods[row.method] = round2(Number(row._sum.amount ?? 0));
    }

    return {
      from: range.from,
      to: range.to,
      totals: {
        netSales,
        billCount,
        averageBill: billCount ? round2(netSales / billCount) : 0,
        grossBeforeDiscount: round2(Number(paid._sum.subtotal ?? 0)),
        discount: round2(Number(paid._sum.discount ?? 0)),
        tax: round2(Number(paid._sum.tax ?? 0)),
        cancelledCount: cancelled._count._all,
        cancelledAmount: round2(Number(cancelled._sum.total ?? 0)),
      },
      byMethod: methods,
      daily: fillDailySeries(
        range.days,
        daily.map((d) => ({ day: d.day, total: round2(Number(d.total)), count: Number(d.cnt) })),
      ),
      topProducts: top.map((t) => ({
        productId: t.product_id,
        name: t.name,
        qty: Number(t.qty),
        revenue: round2(Number(t.revenue)),
      })),
    };
  }
}
