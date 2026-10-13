import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { DiscountPromotion } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto.js';

function toView(d: DiscountPromotion) {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    value: Number(d.value),
    isActive: d.isActive,
    managerOnly: d.managerOnly,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
  };
}

function assertValid(type: 'percent' | 'amount', value: number, startsAt?: Date | null, endsAt?: Date | null) {
  if (type === 'percent' && value > 100) {
    throw new BadRequestException('ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100');
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new BadRequestException('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม');
  }
}

const toDate = (value: string | null | undefined) => (value ? new Date(value) : value === null ? null : undefined);

@Injectable()
export class DiscountsPromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shopId: number) {
    const rows = await this.prisma.discountPromotion.findMany({ where: { shopId }, orderBy: { id: 'asc' } });
    return rows.map(toView);
  }

  // what a cashier may pick right now: active and inside its date window
  async listUsable(shopId: number, role: string) {
    const now = new Date();
    const rows = await this.prisma.discountPromotion.findMany({
      where: {
        shopId,
        isActive: true,
        ...(role === 'cashier' && { managerOnly: false }),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { id: 'asc' },
    });
    return rows.map(toView);
  }

  async create(shopId: number, dto: CreateDiscountDto) {
    const startsAt = toDate(dto.startsAt);
    const endsAt = toDate(dto.endsAt);
    assertValid(dto.type, dto.value, startsAt, endsAt);
    const row = await this.prisma.discountPromotion.create({
      data: {
        shopId,
        name: dto.name.trim(),
        type: dto.type,
        value: dto.value,
        isActive: dto.isActive ?? true,
        managerOnly: dto.managerOnly ?? false,
        startsAt: startsAt ?? null,
        endsAt: endsAt ?? null,
      },
    });
    return toView(row);
  }

  async update(shopId: number, id: number, dto: UpdateDiscountDto) {
    const current = await this.prisma.discountPromotion.findFirst({ where: { id, shopId } });
    if (!current) {
      throw new NotFoundException('ไม่พบส่วนลด');
    }
    const startsAt = dto.startsAt !== undefined ? toDate(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt !== undefined ? toDate(dto.endsAt) : current.endsAt;
    assertValid(dto.type ?? current.type, dto.value ?? Number(current.value), startsAt, endsAt);
    const row = await this.prisma.discountPromotion.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.managerOnly !== undefined && { managerOnly: dto.managerOnly }),
        ...(dto.startsAt !== undefined && { startsAt: startsAt ?? null }),
        ...(dto.endsAt !== undefined && { endsAt: endsAt ?? null }),
      },
    });
    return toView(row);
  }

  // Bills keep their own snapshot (discount_name / discount), so deleting a rule never alters history.
  async remove(shopId: number, id: number) {
    const result = await this.prisma.discountPromotion.deleteMany({ where: { id, shopId } });
    if (result.count === 0) {
      throw new NotFoundException('ไม่พบส่วนลด');
    }
  }
}
