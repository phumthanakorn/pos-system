import { BadRequestException, Injectable } from '@nestjs/common';
import { round2 } from '../../common/helpers/money.js';
import { parseReportRange, type ReportRange } from '../../common/helpers/report-range.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const TOP_MOVERS = 10;

@Injectable()
export class StockReportService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(shopId: number, from?: string, to?: string) {
    let range: ReportRange;
    try {
      range = parseReportRange(from, to);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'ช่วงวันที่ไม่ถูกต้อง');
    }

    const tracked = await this.prisma.product.findMany({
      where: { shopId, trackStock: true, isActive: true },
      select: { id: true, name: true, unit: true, stockQty: true, minStock: true, cost: true },
    });

    let stockValue = 0;
    let costlessCount = 0;
    const lowStock: { id: number; name: string; unit: string; stockQty: number; minStock: number }[] = [];
    const outOfStock: { id: number; name: string; unit: string }[] = [];
    for (const p of tracked) {
      const qty = Number(p.stockQty);
      const minStock = Number(p.minStock);
      if (p.cost !== null) {
        stockValue = round2(stockValue + qty * Number(p.cost));
      } else {
        costlessCount += 1;
      }
      if (qty <= 0) outOfStock.push({ id: p.id, name: p.name, unit: p.unit });
      else if (minStock > 0 && qty <= minStock) lowStock.push({ id: p.id, name: p.name, unit: p.unit, stockQty: qty, minStock });
    }

    const [byTypeRaw, moversRaw] = await Promise.all([
      this.prisma.$queryRaw<{ type: 'purchase' | 'sale' | 'adjustment'; qty: unknown }[]>`
        SELECT sm.type AS type, SUM(sm.qty) AS qty
        FROM stock_movements sm
        WHERE sm.shop_id = ${shopId} AND sm.created_at >= ${range.start} AND sm.created_at < ${range.endExclusive}
        GROUP BY sm.type`,
      this.prisma.$queryRaw<{ product_id: number; name: string; unit: string; moved: unknown }[]>`
        SELECT sm.product_id AS product_id, p.name AS name, p.unit AS unit, SUM(ABS(sm.qty)) AS moved
        FROM stock_movements sm JOIN products p ON p.id = sm.product_id
        WHERE sm.shop_id = ${shopId} AND sm.created_at >= ${range.start} AND sm.created_at < ${range.endExclusive}
        GROUP BY sm.product_id, p.name, p.unit
        ORDER BY moved DESC
        LIMIT ${TOP_MOVERS}`,
    ]);

    const movement = { purchase: 0, sale: 0, adjustment: 0 };
    for (const row of byTypeRaw) {
      movement[row.type] = round2(Math.abs(Number(row.qty)));
    }

    return {
      from: range.from,
      to: range.to,
      trackedCount: tracked.length,
      stockValue,
      costlessCount,
      lowStock: lowStock.sort((a, b) => a.stockQty - b.stockQty),
      outOfStock,
      movement,
      topMovers: moversRaw.map((m) => ({ productId: m.product_id, name: m.name, unit: m.unit, moved: round2(Number(m.moved)) })),
    };
  }
}
