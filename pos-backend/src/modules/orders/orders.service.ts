import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type OrderStatus } from '@prisma/client';
import { resolvePaging, toPageResult } from '../../common/helpers/paginate.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { bangkokDay, bangkokYear, formatOrderNumber, formatReceiptNumber } from '../../common/helpers/document-number.js';
import { nextSequence } from '../../common/helpers/sequence.js';
import type { AuthenticatedUser } from '../../common/helpers/require-shop.js';
import { maxRedeemablePoints, parseLoyalty, pointsEarned, pointsValue } from '../../common/helpers/loyalty.js';
import { calculateDiscount, calculateTotals, round2 } from '../../common/helpers/money.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { PayOrderDto } from './dto/pay-order.dto.js';

const orderInclude = {
  items: { include: { product: { select: { name: true } } } },
  receipt: { select: { receiptNumber: true } },
  payments: { select: { method: true, amount: true } },
  customer: { select: { name: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function toView(order: OrderRow) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    receiptNumber: order.receipt?.receiptNumber ?? null,
    status: order.status,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    discountName: order.discountName,
    tax: Number(order.tax),
    total: Number(order.total),
    paymentMethod: order.payments[0]?.method ?? null,
    kitchenStatus: order.kitchenStatus,
    customerId: order.customerId,
    customerName: order.customer?.name ?? null,
    pointsRedeemed: order.pointsRedeemed,
    pointsEarned: order.pointsEarned,
    voidReason: order.voidReason,
    voidedAt: order.voidedAt,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      qty: Number(item.qty),
      price: Number(item.price),
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(shopId: number, user: AuthenticatedUser, dto: CreateOrderDto) {
    const userId = user.id;
    const shift = await this.prisma.shift.findFirst({ where: { shopId, status: 'open' } });
    if (!shift) {
      throw new BadRequestException('ยังไม่ได้เปิดกะ');
    }

    const qtyByProduct = new Map<number, number>();
    for (const item of dto.items) {
      qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty);
    }

    const products = await this.prisma.product.findMany({
      where: { shopId, isActive: true, id: { in: [...qtyByProduct.keys()] } },
    });
    if (products.length !== qtyByProduct.size) {
      throw new BadRequestException('มีสินค้าที่ไม่พร้อมขายในรายการ');
    }

    // Products with stock counting on must have enough on hand. Owner/manager can confirm an override
    // (the counted number may simply be out of date); cashiers cannot.
    const short = products
      .filter((p) => p.trackStock && (qtyByProduct.get(p.id) ?? 0) > Number(p.stockQty))
      .map((p) => ({ productId: p.id, name: p.name, available: Math.max(Number(p.stockQty), 0), requested: qtyByProduct.get(p.id) ?? 0 }));
    if (short.length > 0 && !(dto.allowOversell && user.role !== 'cashier')) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        canOverride: user.role !== 'cashier',
        items: short,
        message: `สต็อกไม่พอ: ${short.map((s) => `${s.name} (เหลือ ${s.available}, ต้องการ ${s.requested})`).join(', ')}`,
      });
    }

    const lines = products.map((product) => {
      const qty = qtyByProduct.get(product.id) ?? 0;
      const price = Number(product.price);
      return { productId: product.id, qty, price, lineTotal: round2(price * qty) };
    });
    const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const taxSetting = await this.prisma.taxSetting.findFirst({ where: { shopId, isActive: true }, orderBy: { id: 'asc' } });
    let discountRule: { type: 'percent' | 'amount'; value: number } | null = null;
    let discountName: string | null = null;
    if (dto.discountId !== undefined) {
      const now = new Date();
      const found = await this.prisma.discountPromotion.findFirst({
        where: {
          id: dto.discountId,
          shopId,
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
      });
      if (found?.managerOnly && user.role === 'cashier') {
        throw new ForbiddenException('ส่วนลดนี้ใช้ได้เฉพาะผู้จัดการหรือเจ้าของร้าน');
      }
      if (!found) {
        throw new BadRequestException('ส่วนลดนี้ใช้ไม่ได้ (หมดอายุ ปิดใช้งาน หรือไม่พบ)');
      }
      discountRule = { type: found.type, value: Number(found.value) };
      discountName = found.name;
    }
    const ruleDiscount = calculateDiscount(subtotal, discountRule);

    // optional member + point redemption (the points themselves are only deducted when the bill is paid)
    let customerId: number | null = null;
    let pointsRedeemed = 0;
    let pointsDiscount = 0;
    if (dto.customerId !== undefined) {
      const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, shopId } });
      if (!customer) {
        throw new BadRequestException('ไม่พบลูกค้า');
      }
      customerId = customer.id;
      if (dto.redeemPoints) {
        const loyaltyRow = await this.prisma.setting.findUnique({ where: { shopId_key: { shopId, key: 'loyalty' } } });
        const loyalty = parseLoyalty(loyaltyRow?.value);
        if (!loyalty.enabled) {
          throw new BadRequestException('ร้านนี้ยังไม่เปิดใช้ระบบสะสมแต้ม');
        }
        if (dto.redeemPoints > customer.loyaltyPoints) {
          throw new BadRequestException('แต้มของลูกค้าไม่พอ');
        }
        const allowed = maxRedeemablePoints(customer.loyaltyPoints, round2(subtotal - ruleDiscount), loyalty);
        if (dto.redeemPoints > allowed) {
          throw new BadRequestException('ใช้แต้มได้ไม่เกินยอดที่เหลือหลังหักส่วนลด');
        }
        pointsRedeemed = dto.redeemPoints;
        pointsDiscount = pointsValue(pointsRedeemed, loyalty);
      }
    } else if (dto.redeemPoints) {
      throw new BadRequestException('ต้องเลือกลูกค้าก่อนใช้แต้ม');
    }

    const totals = calculateTotals(
      subtotal,
      round2(ruleDiscount + pointsDiscount),
      taxSetting ? { rate: Number(taxSetting.rate), isInclusive: taxSetting.isInclusive } : null,
    );

    const shop = await this.prisma.shop.findUniqueOrThrow({ where: { id: shopId }, select: { logoAbbr: true } });

    const order = await this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.nextOrderNumber(tx, shopId, shop.logoAbbr);
      return tx.order.create({
        data: {
          shopId,
          orderNumber,
          cashierId: userId,
          shiftId: shift.id,
          status: 'open',
          subtotal: totals.subtotal,
          discount: totals.discount,
          discountName,
          customerId,
          pointsRedeemed,
          tax: totals.tax,
          total: totals.total,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              qty: line.qty,
              price: line.price,
            })),
          },
        },
        include: orderInclude,
      });
    });

    return toView(order);
  }

  // Moves the customer's points when a bill is paid: spend the redeemed points, then earn on what was paid.
  // The guarded update means two tills can never spend the same points twice. Returns points earned.
  private async settlePoints(
    tx: Prisma.TransactionClient,
    shopId: number,
    orderId: number,
    customerId: number,
    redeemed: number,
    total: number,
  ) {
    const loyaltyRow = await tx.setting.findUnique({ where: { shopId_key: { shopId, key: 'loyalty' } } });
    const loyalty = parseLoyalty(loyaltyRow?.value);
    if (redeemed > 0) {
      const spent = await tx.customer.updateMany({
        where: { id: customerId, shopId, loyaltyPoints: { gte: redeemed } },
        data: { loyaltyPoints: { decrement: redeemed } },
      });
      if (spent.count === 0) {
        throw new ConflictException('แต้มของลูกค้าไม่พอแล้ว กรุณายกเลิกออเดอร์แล้วสร้างใหม่');
      }
      const after = await tx.customer.findUniqueOrThrow({ where: { id: customerId }, select: { loyaltyPoints: true } });
      await tx.pointTransaction.create({
        data: { shopId, customerId, orderId, type: 'redeem', points: -redeemed, balanceAfter: after.loyaltyPoints },
      });
    }
    const earned = pointsEarned(total, loyalty);
    if (earned > 0) {
      await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: earned } } });
      const after = await tx.customer.findUniqueOrThrow({ where: { id: customerId }, select: { loyaltyPoints: true } });
      await tx.pointTransaction.create({
        data: { shopId, customerId, orderId, type: 'earn', points: earned, balanceAfter: after.loyaltyPoints },
      });
    }
    return earned;
  }

  // Undo the points of a voided bill: give back what was spent, take back what was earned (never below 0).
  private async reversePoints(tx: Prisma.TransactionClient, shopId: number, order: { id: number; customerId: number | null; pointsRedeemed: number; pointsEarned: number }) {
    if (order.customerId === null) return;
    const customerId = order.customerId;
    if (order.pointsRedeemed > 0) {
      await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: order.pointsRedeemed } } });
      const after = await tx.customer.findUniqueOrThrow({ where: { id: customerId }, select: { loyaltyPoints: true } });
      await tx.pointTransaction.create({
        data: { shopId, customerId, orderId: order.id, type: 'refund_redeem', points: order.pointsRedeemed, balanceAfter: after.loyaltyPoints },
      });
    }
    if (order.pointsEarned > 0) {
      const current = await tx.customer.findUniqueOrThrow({ where: { id: customerId }, select: { loyaltyPoints: true } });
      const take = Math.min(order.pointsEarned, current.loyaltyPoints);
      if (take > 0) {
        await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { decrement: take } } });
        await tx.pointTransaction.create({
          data: { shopId, customerId, orderId: order.id, type: 'reverse_earn', points: -take, balanceAfter: current.loyaltyPoints - take },
        });
      }
    }
  }

  // One row per shop/day. LAST_INSERT_ID(expr) makes the increment and the read atomic on the same
  // connection, so two tills selling at the same instant can never receive the same number.
  private async nextOrderNumber(tx: Prisma.TransactionClient, shopId: number, logoAbbr: string | null) {
    const day = bangkokDay(new Date());
    return formatOrderNumber(logoAbbr, day, await nextSequence(tx, shopId, 'order', day));
  }

  // Receipts must be gapless: the counter row stays locked until this transaction commits, so a
  // failed payment rolls the increment back and no number is ever skipped or reused.
  private async nextReceiptNumber(tx: Prisma.TransactionClient, shopId: number, logoAbbr: string | null) {
    const year = bangkokYear(new Date());
    return formatReceiptNumber(logoAbbr, year, await nextSequence(tx, shopId, 'receipt', year));
  }

  async pay(shopId: number, orderId: number, dto: PayOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId },
      include: { items: true, shift: { select: { status: true } } },
    });
    if (!order) {
      throw new NotFoundException('ไม่พบออเดอร์');
    }
    if (order.status !== 'open') {
      throw new ConflictException('ออเดอร์นี้ชำระเงินแล้วหรือถูกยกเลิก');
    }
    if (order.shift.status !== 'open') {
      throw new ConflictException('กะของออเดอร์นี้ถูกปิดแล้ว');
    }

    const total = Number(order.total);
    const received = dto.method === 'cash' ? round2(dto.received ?? total) : total;
    if (received < total) {
      throw new BadRequestException('รับเงินไม่พอ');
    }
    const change = round2(received - total);

    try {
      await this.prisma.$transaction(async (tx) => {
        const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { logoAbbr: true } });
        const receiptNumber = await this.nextReceiptNumber(tx, shopId, shop.logoAbbr);
        await tx.payment.create({ data: { orderId, method: dto.method, amount: total } });
        await tx.receipt.create({ data: { shopId, orderId, receiptNumber } });
        let earned = 0;
        if (order.customerId !== null) {
          earned = await this.settlePoints(tx, shopId, order.id, order.customerId, order.pointsRedeemed, total);
        }
        await tx.order.update({ where: { id: orderId }, data: { status: 'paid', pointsEarned: earned } });

        for (const item of order.items) {
          const qty = Number(item.qty);
          // only products whose stock is counted move; others would drift negative forever
          const moved = await tx.product.updateMany({
            where: { id: item.productId, trackStock: true },
            data: { stockQty: { decrement: qty } },
          });
          if (moved.count === 0) continue;
          await tx.stockMovement.create({
            data: { productId: item.productId, type: 'sale', qty, note: `ออเดอร์ ${order.orderNumber}` },
          });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('ออกเลขใบเสร็จซ้ำ ลองใหม่อีกครั้ง');
      }
      throw error;
    }

    const paid = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    return { order: toView(paid), received, change };
  }

  // A paid order is never deleted: it is marked cancelled and keeps its order/receipt numbers.
  // Only allowed while the order's own shift is still open, because voiding after the drawer was
  // counted would silently change cash that was already reconciled.
  async void(shopId: number, userId: number, orderId: number, reason: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId },
      include: { items: true, shift: { select: { status: true } } },
    });
    if (!order) {
      throw new NotFoundException('ไม่พบออเดอร์');
    }
    if (order.status !== 'paid') {
      throw new ConflictException('ยกเลิกได้เฉพาะออเดอร์ที่ชำระเงินแล้ว');
    }
    if (order.shift.status !== 'open') {
      throw new ConflictException('กะของออเดอร์นี้ปิดแล้ว ยกเลิกบิลไม่ได้');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'cancelled', voidReason: reason.trim(), voidedAt: new Date(), voidedById: userId },
      });
      await this.reversePoints(tx, shopId, order);
      for (const item of order.items) {
        const qty = Number(item.qty);
        const moved = await tx.product.updateMany({
          where: { id: item.productId, trackStock: true },
          data: { stockQty: { increment: qty } },
        });
        if (moved.count === 0) continue;
        await tx.stockMovement.create({
          data: { productId: item.productId, type: 'adjustment', qty, note: `ยกเลิกออเดอร์ ${order.orderNumber}` },
        });
      }
    });

    const voided = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    return toView(voided);
  }

  // Discards an order that was never paid (e.g. the displayed total no longer matched). Unlike void,
  // nothing was charged, so any seller may do it, but only for open orders of their own shop.
  async discardOpen(shopId: number, orderId: number) {
    const result = await this.prisma.order.updateMany({
      where: { id: orderId, shopId, status: 'open' },
      data: { status: 'cancelled', voidReason: 'ยกเลิกก่อนชำระเงิน', voidedAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('ไม่พบออเดอร์ที่ยังไม่ชำระเงิน');
    }
  }

  // Open and newly paid bills for the kitchen screen, oldest first (first in, first served); a bill
  // drops off once marked served. No pagination: a kitchen queue is meant to be seen in full.
  async kitchenQueue(shopId: number) {
    const orders = await this.prisma.order.findMany({
      where: { shopId, status: { in: ['open', 'paid'] }, kitchenStatus: { not: 'served' } },
      include: orderInclude,
      orderBy: { id: 'asc' },
    });
    return orders.map(toView);
  }

  async updateKitchenStatus(shopId: number, orderId: number, status: 'pending' | 'preparing' | 'ready' | 'served') {
    const result = await this.prisma.order.updateMany({
      where: { id: orderId, shopId, status: { in: ['open', 'paid'] } },
      data: { kitchenStatus: status },
    });
    if (result.count === 0) {
      throw new NotFoundException('ไม่พบออเดอร์');
    }
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    return toView(order);
  }

  async list(shopId: number, query: ListOrdersDto) {
    const statuses = (query.status?.split(',') ?? []) as OrderStatus[];
    const search = query.search?.trim();
    const where: Prisma.OrderWhereInput = {
      shopId,
      ...(statuses.length && { status: { in: statuses } }),
      ...(search && {
        OR: [{ orderNumber: { contains: search } }, { receipt: { is: { receiptNumber: { contains: search } } } }],
      }),
    };
    const { page, pageSize, skip, take } = resolvePaging(query.page, query.pageSize);
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ where, include: orderInclude, orderBy: { id: 'desc' }, skip, take }),
      this.prisma.order.count({ where }),
    ]);
    return toPageResult(orders.map(toView), total, page, pageSize);
  }
}
