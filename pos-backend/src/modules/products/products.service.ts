import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Product } from '@prisma/client';
import { CodesService } from '../../common/codes/codes.service.js';
import { resolvePaging, toPageResult } from '../../common/helpers/paginate.js';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

const DEFAULT_UNIT = 'ชิ้น';

function toView(product: Product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    categoryId: product.categoryId,
    barcode: product.barcode ?? '',
    unit: product.unit,
    isActive: product.isActive,
    sku: product.sku ?? '',
    description: product.description ?? '',
    imageUrl: product.imageUrl,
    cost: product.cost === null ? null : Number(product.cost),
    stockQty: Number(product.stockQty),
    minStock: Number(product.minStock),
    trackStock: product.trackStock,
  };
}

function normalizeBarcode(barcode: string | undefined): string | null {
  const trimmed = barcode?.trim();
  return trimmed ? trimmed : null;
}

function mapWriteError(error: unknown): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictException('SKU หรือบาร์โค้ดนี้ถูกใช้แล้วในร้าน');
    }
    if (error.code === 'P2003') {
      return new ConflictException('สินค้านี้มีประวัติการขาย ลบไม่ได้');
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

function toMovementView(m: { id: number; type: string; qty: Prisma.Decimal; balanceAfter: Prisma.Decimal; note: string | null; createdAt: Date; createdBy: { name: string } | null }) {
  return {
    id: m.id,
    type: m.type,
    qty: Number(m.qty),
    balanceAfter: Number(m.balanceAfter),
    note: m.note,
    createdByName: m.createdBy?.name ?? null,
    createdAt: m.createdAt,
  };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodesService,
  ) {}

  // Products with stock counting on, at or below their minimum (minStock = 0 means "no alert set").
  async lowStock(shopId: number) {
    const products = await this.prisma.product.findMany({
      where: { shopId, trackStock: true, isActive: true, minStock: { gt: 0 } },
      orderBy: { name: 'asc' },
    });
    return products
      .filter((p) => Number(p.stockQty) <= Number(p.minStock))
      .map(toView);
  }

  async adjustStock(shopId: number, userId: number, productId: number, dto: StockAdjustmentDto) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, shopId } });
    if (!product) {
      throw new NotFoundException('ไม่พบสินค้า');
    }
    if (!product.trackStock) {
      throw new BadRequestException('สินค้านี้ไม่ได้เปิดนับสต็อก กรุณาเปิดที่หน้าแก้ไขสินค้าก่อน');
    }
    const nextQty = Number(product.stockQty) + dto.qty;
    if (nextQty < 0) {
      throw new BadRequestException(`ปรับแล้วสต็อกจะติดลบ (ปัจจุบันเหลือ ${Number(product.stockQty)})`);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: productId }, data: { stockQty: nextQty } });
      await tx.stockMovement.create({
        data: {
          shopId,
          productId,
          type: dto.type,
          qty: dto.qty,
          balanceAfter: nextQty,
          note: dto.note.trim(),
          createdById: userId,
        },
      });
    });
    return toView(await this.prisma.product.findUniqueOrThrow({ where: { id: productId } }));
  }

  async stockMovements(shopId: number, productId: number, query: PageQueryDto) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, shopId }, select: { id: true } });
    if (!product) {
      throw new NotFoundException('ไม่พบสินค้า');
    }
    const { page, pageSize, skip, take } = resolvePaging(query.page, query.pageSize);
    const where = { productId };
    const [rows, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: { createdBy: { select: { name: true } } },
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return toPageResult(rows.map(toMovementView), total, page, pageSize);
  }

  // Everything the till can sell. Not paginated on purpose: the POS grid needs the whole active menu to filter instantly.
  async findSellable(shopId: number) {
    const products = await this.prisma.product.findMany({
      where: { shopId, isActive: true },
      orderBy: { id: 'asc' },
    });
    return products.map(toView);
  }

  async findPage(shopId: number, query: ListProductsDto) {
    const search = query.search?.trim();
    const where: Prisma.ProductWhereInput = {
      shopId,
      ...(query.categoryId !== undefined && { categoryId: query.categoryId }),
      ...(query.status && { isActive: query.status === 'active' }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
          { barcode: { contains: search } },
        ],
      }),
    };
    const { page, pageSize, skip, take } = resolvePaging(
      query.page,
      query.pageSize,
    );
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.product.count({ where }),
    ]);
    return toPageResult(rows.map(toView), total, page, pageSize);
  }

  async create(shopId: number, dto: CreateProductDto) {
    await this.assertCategoryInShop(shopId, dto.categoryId);
    const sku = normalizeBarcode(dto.sku);
    const barcode = normalizeBarcode(dto.barcode);
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        await this.codes.assertFreeInOtherTable(
          tx,
          shopId,
          { sku, barcode },
          'ingredient',
        );
        return tx.product.create({
          data: {
            shopId,
            name: dto.name.trim(),
            price: dto.price,
            categoryId: dto.categoryId ?? null,
            barcode,
            sku,
            description: normalizeBarcode(dto.description),
            cost: dto.cost ?? null,
            stockQty: dto.stockQty ?? 0,
            minStock: dto.minStock ?? 0,
            trackStock: dto.trackStock ?? false,
            unit: dto.unit?.trim() || DEFAULT_UNIT,
            isActive: dto.isActive ?? true,
          },
        });
      });
      return toView(product);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async update(shopId: number, id: number, dto: UpdateProductDto) {
    await this.assertOwned(shopId, id);
    if (dto.categoryId !== undefined) {
      await this.assertCategoryInShop(shopId, dto.categoryId);
    }
    const newSku =
      dto.sku !== undefined ? normalizeBarcode(dto.sku) : undefined;
    const newBarcode =
      dto.barcode !== undefined ? normalizeBarcode(dto.barcode) : undefined;
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        // only codes being set now are checked, so editing other fields of a legacy item is never blocked
        await this.codes.assertFreeInOtherTable(
          tx,
          shopId,
          { sku: newSku, barcode: newBarcode },
          'ingredient',
        );
        return tx.product.update({
          where: { id },
          data: {
            ...(dto.name !== undefined && { name: dto.name.trim() }),
            ...(dto.price !== undefined && { price: dto.price }),
            ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
            ...(dto.barcode !== undefined && {
              barcode: normalizeBarcode(dto.barcode),
            }),
            ...(dto.sku !== undefined && { sku: normalizeBarcode(dto.sku) }),
            ...(dto.description !== undefined && {
              description: normalizeBarcode(dto.description),
            }),
            ...(dto.cost !== undefined && { cost: dto.cost }),
            ...(dto.stockQty !== undefined && { stockQty: dto.stockQty }),
            ...(dto.minStock !== undefined && { minStock: dto.minStock }),
            ...(dto.trackStock !== undefined && { trackStock: dto.trackStock }),
            ...(dto.unit !== undefined && {
              unit: dto.unit.trim() || DEFAULT_UNIT,
            }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          },
        });
      });
      return toView(product);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async remove(shopId: number, id: number): Promise<string | null> {
    const product = await this.prisma.product.findFirst({
      where: { id, shopId },
    });
    if (!product) {
      throw new NotFoundException('ไม่พบสินค้า');
    }
    try {
      await this.prisma.product.delete({ where: { id } });
      return product.imageUrl;
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async setImage(shopId: number, id: number, imageUrl: string | null) {
    const product = await this.prisma.product.findFirst({
      where: { id, shopId },
    });
    if (!product) {
      throw new NotFoundException('ไม่พบสินค้า');
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: { imageUrl },
    });
    return { view: toView(updated), previousUrl: product.imageUrl };
  }

  private async assertOwned(shopId: number, id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, shopId },
    });
    if (!product) {
      throw new NotFoundException('ไม่พบสินค้า');
    }
  }

  private async assertCategoryInShop(
    shopId: number,
    categoryId: number | null | undefined,
  ) {
    if (categoryId === null || categoryId === undefined) {
      return;
    }
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, shopId },
    });
    if (!category) {
      throw new BadRequestException('หมวดหมู่ไม่ถูกต้อง');
    }
  }
}
