import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, type Ingredient } from '@prisma/client';
import { CodesService } from '../../common/codes/codes.service.js';
import { resolvePaging, toPageResult } from '../../common/helpers/paginate.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ListIngredientsDto } from './dto/list-ingredients.dto.js';
import { IngredientCategoryDto } from './dto/ingredient-category.dto.js';
import { CreateIngredientDto } from './dto/ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';

function nullIfBlank(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toView(item: Ingredient & { category: { name: string } | null }) {
  const stockQty = Number(item.stockQty);
  const minStock = Number(item.minStock);
  return {
    id: item.id,
    name: item.name,
    categoryId: item.categoryId,
    categoryName: item.category?.name ?? null,
    sku: item.sku ?? '',
    barcode: item.barcode ?? '',
    unit: item.unit,
    costPerUnit: Number(item.costPerUnit),
    stockQty,
    minStock,
    isLowStock: minStock > 0 && stockQty <= minStock,
    supplierName: item.supplierName ?? '',
    yieldPercent: Number(item.yieldPercent),
    purchaseUnit: item.purchaseUnit ?? '',
    purchaseQty: item.purchaseQty === null ? null : Number(item.purchaseQty),
    purchasePrice:
      item.purchasePrice === null ? null : Number(item.purchasePrice),
    note: item.note ?? '',
    isActive: item.isActive,
  };
}

function mapWriteError(error: unknown): Error {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return new ConflictException('SKU หรือบาร์โค้ดนี้ถูกใช้แล้วในร้าน');
  }
  return error instanceof Error ? error : new Error(String(error));
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodesService,
  ) {}

  listCategories(shopId: number) {
    return this.prisma.ingredientCategory.findMany({
      where: { shopId },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  }

  createCategory(shopId: number, dto: IngredientCategoryDto) {
    return this.prisma.ingredientCategory.create({
      data: { shopId, name: dto.name.trim() },
      select: { id: true, name: true },
    });
  }

  async updateCategory(shopId: number, id: number, dto: IngredientCategoryDto) {
    await this.assertCategory(shopId, id);
    return this.prisma.ingredientCategory.update({
      where: { id },
      data: { name: dto.name.trim() },
      select: { id: true, name: true },
    });
  }

  async removeCategory(shopId: number, id: number) {
    await this.assertCategory(shopId, id);
    const count = await this.prisma.ingredient.count({
      where: { shopId, categoryId: id },
    });
    if (count > 0) {
      throw new ConflictException('มีวัตถุดิบอยู่ในหมวดหมู่นี้ ลบไม่ได้');
    }
    await this.prisma.ingredientCategory.delete({ where: { id } });
  }

  async listIngredients(shopId: number, query: ListIngredientsDto) {
    const search = query.search?.trim();
    const where: Prisma.IngredientWhereInput = {
      shopId,
      ...(query.categoryId !== undefined && { categoryId: query.categoryId }),
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
    const [rows, total, lowStock] = await Promise.all([
      this.prisma.ingredient.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.ingredient.count({ where }),
      // column-to-column comparison is not expressible in Prisma's filter API
      this.prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*) AS n FROM ingredients WHERE shop_id = ${shopId} AND min_stock > 0 AND stock_qty <= min_stock`,
    ]);
    return {
      ...toPageResult(rows.map(toView), total, page, pageSize),
      lowStockCount: Number(lowStock[0]?.n ?? 0),
    };
  }

  async createIngredient(shopId: number, dto: CreateIngredientDto) {
    await this.assertCategoryIfGiven(shopId, dto.categoryId);
    const sku = nullIfBlank(dto.sku) ?? null;
    const barcode = nullIfBlank(dto.barcode) ?? null;
    try {
      const item = await this.prisma.$transaction(async (tx) => {
        await this.codes.assertFreeInOtherTable(
          tx,
          shopId,
          { sku, barcode },
          'product',
        );
        return tx.ingredient.create({
          data: {
            shopId,
            name: dto.name.trim(),
            categoryId: dto.categoryId ?? null,
            sku,
            barcode,
            unit: dto.unit?.trim() || 'g',
            costPerUnit: dto.costPerUnit ?? 0,
            stockQty: dto.stockQty ?? 0,
            minStock: dto.minStock ?? 0,
            supplierName: nullIfBlank(dto.supplierName) ?? null,
            yieldPercent: dto.yieldPercent ?? 100,
            purchaseUnit: nullIfBlank(dto.purchaseUnit) ?? null,
            purchaseQty: dto.purchaseQty ?? null,
            purchasePrice: dto.purchasePrice ?? null,
            note: nullIfBlank(dto.note) ?? null,
            isActive: dto.isActive ?? true,
          },
          include: { category: { select: { name: true } } },
        });
      });
      return toView(item);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async updateIngredient(shopId: number, id: number, dto: UpdateIngredientDto) {
    await this.assertIngredient(shopId, id);
    if (dto.categoryId !== undefined) {
      await this.assertCategoryIfGiven(shopId, dto.categoryId);
    }
    const data: Prisma.IngredientUncheckedUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.sku !== undefined && { sku: nullIfBlank(dto.sku) }),
      ...(dto.barcode !== undefined && { barcode: nullIfBlank(dto.barcode) }),
      ...(dto.unit !== undefined && { unit: dto.unit.trim() || 'g' }),
      ...(dto.costPerUnit !== undefined && { costPerUnit: dto.costPerUnit }),
      ...(dto.stockQty !== undefined && { stockQty: dto.stockQty }),
      ...(dto.minStock !== undefined && { minStock: dto.minStock }),
      ...(dto.supplierName !== undefined && {
        supplierName: nullIfBlank(dto.supplierName),
      }),
      ...(dto.yieldPercent !== undefined && { yieldPercent: dto.yieldPercent }),
      ...(dto.purchaseUnit !== undefined && {
        purchaseUnit: nullIfBlank(dto.purchaseUnit),
      }),
      ...(dto.purchaseQty !== undefined && { purchaseQty: dto.purchaseQty }),
      ...(dto.purchasePrice !== undefined && {
        purchasePrice: dto.purchasePrice,
      }),
      ...(dto.note !== undefined && { note: nullIfBlank(dto.note) }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };
    const newSku = dto.sku !== undefined ? nullIfBlank(dto.sku) : undefined;
    const newBarcode =
      dto.barcode !== undefined ? nullIfBlank(dto.barcode) : undefined;
    try {
      const item = await this.prisma.$transaction(async (tx) => {
        // only codes being set now are checked, so editing other fields of a legacy item is never blocked
        await this.codes.assertFreeInOtherTable(
          tx,
          shopId,
          { sku: newSku, barcode: newBarcode },
          'product',
        );
        return tx.ingredient.update({
          where: { id },
          data,
          include: { category: { select: { name: true } } },
        });
      });
      return toView(item);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async removeIngredient(shopId: number, id: number) {
    await this.assertIngredient(shopId, id);
    await this.prisma.ingredient.delete({ where: { id } });
  }

  private async assertIngredient(shopId: number, id: number) {
    const item = await this.prisma.ingredient.findFirst({
      where: { id, shopId },
    });
    if (!item) throw new NotFoundException('ไม่พบวัตถุดิบ');
  }

  private async assertCategory(shopId: number, id: number) {
    const category = await this.prisma.ingredientCategory.findFirst({
      where: { id, shopId },
    });
    if (!category) throw new NotFoundException('ไม่พบหมวดหมู่');
  }

  private async assertCategoryIfGiven(
    shopId: number,
    categoryId: number | null | undefined,
  ) {
    if (categoryId === null || categoryId === undefined) return;
    const category = await this.prisma.ingredientCategory.findFirst({
      where: { id: categoryId, shopId },
    });
    if (!category) throw new BadRequestException('หมวดหมู่ไม่ถูกต้อง');
  }
}
