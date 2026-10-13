import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { expectedDrawerCash, round2 } from '../../common/helpers/money.js';
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
