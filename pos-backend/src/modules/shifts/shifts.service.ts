import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { expectedDrawerCash, round2 } from '../../common/helpers/money.js';
import { Prisma } from '@prisma/client';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { resolvePaging, toPageResult } from '../../common/helpers/paginate.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CashMovementDto } from './dto/cash-movement.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  // Everything the shift screen shows, computed from the database (paid orders only: voided bills never count).
  private async summarize(shiftId: number, openingCash: number) {
    const [byMethod, movements] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { order: { shiftId, status: 'paid' } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.cashMovement.findMany({ where: { shiftId }, orderBy: { id: 'desc' } }),
    ]);

    const sales = { cash: 0, card: 0, qr: 0, total: 0, count: 0 };
    for (const row of byMethod) {
      const amount = Number(row._sum.amount ?? 0);
      sales[row.method] = round2(amount);
      sales.total = round2(sales.total + amount);
      sales.count += row._count._all;
    }
    const cashIn = round2(movements.filter((m) => m.type === 'in').reduce((sum, m) => sum + Number(m.amount), 0));
    const cashOut = round2(movements.filter((m) => m.type === 'out').reduce((sum, m) => sum + Number(m.amount), 0));
    const expectedCash = expectedDrawerCash({ openingCash, cashSales: sales.cash, cashIn, cashOut });

    return {
      sales,
      cashIn,
      cashOut,
      expectedCash,
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        amount: Number(m.amount),
        reason: m.reason,
        createdAt: m.createdAt,
      })),
    };
  }

  // Closed shifts, newest first. Figures are recomputed from the bills and cash movements of each shift
  // (a closed shift can no longer change: no new bills, no voids), so they always match the day's records.
  async history(shopId: number, query: PageQueryDto) {
    const where: Prisma.ShiftWhereInput = { shopId, status: 'closed' };
    const { page, pageSize, skip, take } = resolvePaging(query.page, query.pageSize);
    const [shifts, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
        include: { cashier: { select: { name: true } } },
      }),
      this.prisma.shift.count({ where }),
    ]);
    const ids = shifts.map((s) => s.id);
    const [payRows, moveRows, cancelRows] = ids.length
      ? await Promise.all([
          this.prisma.$queryRaw<{ shiftId: number; method: 'cash' | 'card' | 'qr'; amount: unknown; cnt: bigint }[]>`
            SELECT o.shift_id AS shiftId, p.method AS method, SUM(p.amount) AS amount, COUNT(*) AS cnt
            FROM payments p JOIN orders o ON o.id = p.order_id
            WHERE o.status = 'paid' AND o.shift_id IN (${Prisma.join(ids)})
            GROUP BY o.shift_id, p.method`,
          this.prisma.cashMovement.groupBy({
            by: ['shiftId', 'type'],
            where: { shiftId: { in: ids } },
            _sum: { amount: true },
          }),
          this.prisma.order.groupBy({
            by: ['shiftId'],
            where: { shiftId: { in: ids }, status: 'cancelled', voidedAt: { not: null } },
            _count: { _all: true },
            _sum: { total: true },
          }),
        ])
      : [[], [], []];

    const items = shifts.map((shift) => {
      const sales = { cash: 0, card: 0, qr: 0, total: 0, count: 0 };
      for (const row of payRows.filter((r) => Number(r.shiftId) === shift.id)) {
        const amount = Number(row.amount);
        sales[row.method] = round2(amount);
        sales.total = round2(sales.total + amount);
        sales.count += Number(row.cnt);
      }
      const moved = (type: 'in' | 'out') =>
        round2(Number(moveRows.find((m) => m.shiftId === shift.id && m.type === type)?._sum.amount ?? 0));
      const cashIn = moved('in');
      const cashOut = moved('out');
      const openingCash = Number(shift.openingCash);
      const expectedCash = expectedDrawerCash({ openingCash, cashSales: sales.cash, cashIn, cashOut });
      const closingCash = Number(shift.closingCash ?? 0);
      const cancelled = cancelRows.find((c) => c.shiftId === shift.id);
      return {
        id: shift.id,
        cashierName: shift.cashier.name,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        openingCash,
        sales,
        cashIn,
        cashOut,
        expectedCash,
        closingCash,
        difference: round2(closingCash - expectedCash),
        cancelledCount: cancelled?._count._all ?? 0,
        cancelledAmount: round2(Number(cancelled?._sum.total ?? 0)),
      };
    });
    return toPageResult(items, total, page, pageSize);
  }

  async getById(shopId: number, id: number) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, shopId },
      include: { cashier: { select: { name: true } } },
    });
    if (!shift) {
      throw new NotFoundException('ไม่พบกะ');
    }
    const openingCash = Number(shift.openingCash);
    const summary = await this.summarize(shift.id, openingCash);
    const closingCash = shift.closingCash === null ? null : Number(shift.closingCash);
    return {
      id: shift.id,
      status: shift.status,
      cashierName: shift.cashier.name,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      openingCash,
      closingCash,
      difference: closingCash === null ? null : round2(closingCash - summary.expectedCash),
      ...summary,
    };
  }

  async getCurrent(shopId: number) {
    const shift = await this.prisma.shift.findFirst({
      where: { shopId, status: 'open' },
      include: { cashier: { select: { name: true } } },
    });
    if (!shift) return null;
    const openingCash = Number(shift.openingCash);
    return {
      id: shift.id,
      openingCash,
      openedAt: shift.openedAt,
      cashierName: shift.cashier.name,
      ...(await this.summarize(shift.id, openingCash)),
    };
  }

  async open(shopId: number, userId: number, dto: OpenShiftDto) {
    const existing = await this.prisma.shift.findFirst({ where: { shopId, status: 'open' } });
    if (existing) {
      throw new ConflictException('มีกะที่เปิดอยู่แล้ว');
    }
    await this.prisma.shift.create({
      data: { shopId, cashierId: userId, openingCash: round2(dto.openingCash), status: 'open' },
    });
    return this.getCurrent(shopId);
  }

  async addCashMovement(shopId: number, userId: number, dto: CashMovementDto) {
    const shift = await this.prisma.shift.findFirst({ where: { shopId, status: 'open' } });
    if (!shift) {
      throw new NotFoundException('ไม่มีกะที่เปิดอยู่');
    }
    if (dto.type === 'out') {
      const current = await this.summarize(shift.id, Number(shift.openingCash));
      if (round2(dto.amount) > current.expectedCash) {
        throw new BadRequestException(`นำเงินออกเกินเงินสดในลิ้นชัก (มี ฿${current.expectedCash.toFixed(2)})`);
      }
    }
    await this.prisma.cashMovement.create({
      data: {
        shopId,
        shiftId: shift.id,
        type: dto.type,
        amount: round2(dto.amount),
        reason: dto.reason.trim(),
        createdById: userId,
      },
    });
    return this.getCurrent(shopId);
  }

  async close(shopId: number, user: { id: number; role: string }, dto: CloseShiftDto) {
    const shift = await this.prisma.shift.findFirst({ where: { shopId, status: 'open' } });
    if (!shift) {
      throw new NotFoundException('ไม่มีกะที่เปิดอยู่');
    }
    // a cashier may only close the shift they opened; owner/manager may close any
    if (user.role === 'cashier' && shift.cashierId !== user.id) {
      throw new ForbiddenException('ปิดกะได้เฉพาะคนที่เปิดกะ หรือผู้จัดการ/เจ้าของร้าน');
    }
    // unpaid held bills could no longer be paid once the shift is closed
    const openOrders = await this.prisma.order.count({ where: { shiftId: shift.id, status: 'open' } });
    if (openOrders > 0) {
      throw new ConflictException(`ยังมี ${openOrders} ออเดอร์ที่ยังไม่ชำระเงิน กรุณาชำระหรือยกเลิกก่อนปิดกะ`);
    }
    const openingCash = Number(shift.openingCash);
    const summary = await this.summarize(shift.id, openingCash);
    const closingCash = round2(dto.closingCash);

    await this.prisma.shift.update({
      where: { id: shift.id },
      data: { status: 'closed', closingCash, closedAt: new Date() },
    });

    return {
      id: shift.id,
      openingCash,
      sales: summary.sales,
      cashSales: summary.sales.cash,
      cashIn: summary.cashIn,
      cashOut: summary.cashOut,
      expectedCash: summary.expectedCash,
      closingCash,
      difference: round2(closingCash - summary.expectedCash),
    };
  }
}
