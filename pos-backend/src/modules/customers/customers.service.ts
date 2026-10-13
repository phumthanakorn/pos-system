import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { parseLoyalty, pointsEarned } from '../../common/helpers/loyalty.js';
import { resolvePaging, toPageResult } from '../../common/helpers/paginate.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdjustPointsDto, CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto.js';

const customerSelect = { id: true, name: true, phone: true, note: true, loyaltyPoints: true, createdAt: true } satisfies Prisma.CustomerSelect;
type CustomerRow = Prisma.CustomerGetPayload<{ select: typeof customerSelect }>;

const toView = (c: CustomerRow) => ({
  id: c.id,
  name: c.name,
  phone: c.phone ?? '',
  note: c.note ?? '',
  points: c.loyaltyPoints,
  createdAt: c.createdAt,
});

// Phone numbers are stored as digits only so "081-234-5678" and "0812345678" are the same member.
function normalizePhone(phone: string | undefined): string | null {
  if (phone === undefined) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits === '') return null;
  if (digits.length < 9 || digits.length > 15) {
    throw new BadRequestException('เบอร์โทรไม่ถูกต้อง (ต้องเป็นตัวเลข 9-15 หลัก)');
  }
  return digits;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shopId: number, query: PageQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.CustomerWhereInput = {
      shopId,
      ...(search && { OR: [{ name: { contains: search } }, { phone: { contains: search.replace(/\D/g, '') || search } }] }),
    };
    const { page, pageSize, skip, take } = resolvePaging(query.page, query.pageSize);
    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({ where, select: customerSelect, orderBy: { id: 'desc' }, skip, take }),
      this.prisma.customer.count({ where }),
    ]);
    return toPageResult(rows.map(toView), total, page, pageSize);
  }

  async detail(shopId: number, id: number) {
    const customer = await this.prisma.customer.findFirst({ where: { id, shopId }, select: customerSelect });
    if (!customer) {
      throw new NotFoundException('ไม่พบลูกค้า');
    }
    const [entries, orders, spent] = await Promise.all([
      this.prisma.pointTransaction.findMany({ where: { customerId: id }, orderBy: { id: 'desc' }, take: 20 }),
      this.prisma.order.findMany({
        where: { customerId: id, status: 'paid' },
        orderBy: { id: 'desc' },
        take: 10,
        select: { id: true, orderNumber: true, total: true, createdAt: true },
      }),
      this.prisma.order.aggregate({ where: { customerId: id, status: 'paid' }, _sum: { total: true }, _count: { _all: true } }),
    ]);
    return {
      ...toView(customer),
      billCount: spent._count._all,
      totalSpent: Number(spent._sum.total ?? 0),
      recentOrders: orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, total: Number(o.total), createdAt: o.createdAt })),
      pointHistory: entries.map((e) => ({
        id: e.id,
        type: e.type,
        points: e.points,
        balanceAfter: e.balanceAfter,
        note: e.note,
        createdAt: e.createdAt,
      })),
    };
  }

  async create(shopId: number, dto: CreateCustomerDto) {
    try {
      const row = await this.prisma.customer.create({
        data: { shopId, name: dto.name.trim(), phone: normalizePhone(dto.phone), note: dto.note?.trim() || null },
        select: customerSelect,
      });
      return toView(row);
    } catch (error) {
      this.rethrowDuplicatePhone(error);
      throw error;
    }
  }

  async update(shopId: number, id: number, dto: UpdateCustomerDto) {
    await this.assertOwned(shopId, id);
    try {
      const row = await this.prisma.customer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.phone !== undefined && { phone: normalizePhone(dto.phone) }),
          ...(dto.note !== undefined && { note: dto.note.trim() || null }),
        },
        select: customerSelect,
      });
      return toView(row);
    } catch (error) {
      this.rethrowDuplicatePhone(error);
      throw error;
    }
  }

  // Past bills keep existing (customer_id becomes null); the point history goes with the customer.
  async remove(shopId: number, id: number) {
    const result = await this.prisma.customer.deleteMany({ where: { id, shopId } });
    if (result.count === 0) {
      throw new NotFoundException('ไม่พบลูกค้า');
    }
  }

  async adjustPoints(shopId: number, id: number, dto: AdjustPointsDto) {
    if (dto.points === 0) {
      throw new BadRequestException('จำนวนแต้มต้องไม่เป็น 0');
    }
    await this.assertOwned(shopId, id);
    await this.prisma.$transaction(async (tx) => {
      if (dto.points < 0) {
        const taken = await tx.customer.updateMany({
          where: { id, shopId, loyaltyPoints: { gte: -dto.points } },
          data: { loyaltyPoints: { increment: dto.points } },
        });
        if (taken.count === 0) {
          throw new ConflictException('แต้มคงเหลือไม่พอให้หัก');
        }
      } else {
        await tx.customer.update({ where: { id }, data: { loyaltyPoints: { increment: dto.points } } });
      }
      const after = await tx.customer.findUniqueOrThrow({ where: { id }, select: { loyaltyPoints: true } });
      await tx.pointTransaction.create({
        data: { shopId, customerId: id, type: 'adjust', points: dto.points, balanceAfter: after.loyaltyPoints, note: dto.reason.trim() },
      });
    });
    return this.detail(shopId, id);
  }

  // Credits points for paid bills that never earned any (e.g. sold before the loyalty program was switched
  // on), using the current rates. A bill that already earned points is skipped, so running it twice is safe.
  async recalculatePoints(shopId: number, customerId?: number) {
    if (customerId !== undefined) await this.assertOwned(shopId, customerId);
    const row = await this.prisma.setting.findUnique({ where: { shopId_key: { shopId, key: 'loyalty' } } });
    const loyalty = parseLoyalty(row?.value);
    if (!loyalty.enabled) {
      throw new BadRequestException('ยังไม่ได้เปิดใช้ระบบสะสมแต้ม (ตั้งค่า > สะสมแต้ม)');
    }
    const orders = await this.prisma.order.findMany({
      where: { shopId, status: 'paid', pointsEarned: 0, customerId: customerId ?? { not: null } },
      select: { id: true, customerId: true, total: true },
      orderBy: { id: 'asc' },
    });
    let creditedOrders = 0;
    let creditedPoints = 0;
    for (const order of orders) {
      const earned = pointsEarned(Number(order.total), loyalty);
      if (earned <= 0 || order.customerId === null) continue;
      const done = await this.prisma.$transaction(async (tx) => {
        // the guard makes a concurrent run credit each bill only once
        const claimed = await tx.order.updateMany({ where: { id: order.id, pointsEarned: 0 }, data: { pointsEarned: earned } });
        if (claimed.count === 0) return false;
        await tx.customer.update({ where: { id: order.customerId! }, data: { loyaltyPoints: { increment: earned } } });
        const after = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId! }, select: { loyaltyPoints: true } });
        await tx.pointTransaction.create({
          data: { shopId, customerId: order.customerId!, orderId: order.id, type: 'earn', points: earned, balanceAfter: after.loyaltyPoints, note: 'คำนวณย้อนหลัง' },
        });
        return true;
      });
      if (done) {
        creditedOrders += 1;
        creditedPoints += earned;
      }
    }
    return { orders: creditedOrders, points: creditedPoints };
  }

  private async assertOwned(shopId: number, id: number) {
    const found = await this.prisma.customer.findFirst({ where: { id, shopId }, select: { id: true } });
    if (!found) {
      throw new NotFoundException('ไม่พบลูกค้า');
    }
  }

  private rethrowDuplicatePhone(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('เบอร์โทรนี้มีในระบบแล้ว');
    }
  }
}
