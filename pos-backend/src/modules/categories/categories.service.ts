import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(shopId: number) {
    return this.prisma.category.findMany({
      where: { shopId },
      select: { id: true, name: true, sortOrder: true, _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }).then((rows) => rows.map((row) => ({ id: row.id, name: row.name, sortOrder: row.sortOrder, productCount: row._count.products })));
  }

  async create(shopId: number, dto: CreateCategoryDto) {
    // new categories go to the end of the list
    const last = await this.prisma.category.aggregate({ where: { shopId }, _max: { sortOrder: true } });
    return this.prisma.category.create({
      data: { shopId, name: dto.name.trim(), sortOrder: (last._max.sortOrder ?? 0) + 1 },
      select: { id: true, name: true, sortOrder: true },
    });
  }

  // ids in the desired display order; every category of this shop must be present exactly once
  async reorder(shopId: number, ids: number[]) {
    const categories = await this.prisma.category.findMany({ where: { shopId }, select: { id: true } });
    const existing = new Set(categories.map((c) => c.id));
    if (ids.length !== existing.size || !ids.every((id) => existing.has(id)) || new Set(ids).size !== ids.length) {
      throw new BadRequestException('รายการหมวดหมู่ไม่ตรงกับร้านนี้');
    }
    await this.prisma.$transaction(ids.map((id, index) => this.prisma.category.update({ where: { id }, data: { sortOrder: index } })));
    return this.findAll(shopId);
  }

  async update(shopId: number, id: number, dto: UpdateCategoryDto) {
    await this.assertOwned(shopId, id);
    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name.trim() },
      select: { id: true, name: true, sortOrder: true },
    });
  }

  async remove(shopId: number, id: number) {
    await this.assertOwned(shopId, id);
    const productCount = await this.prisma.product.count({ where: { shopId, categoryId: id } });
    if (productCount > 0) {
      throw new ConflictException('มีสินค้าอยู่ในหมวดหมู่นี้ ลบไม่ได้');
    }
    await this.prisma.category.delete({ where: { id } });
  }

  private async assertOwned(shopId: number, id: number) {
    const category = await this.prisma.category.findFirst({ where: { id, shopId } });
    if (!category) {
      throw new NotFoundException('ไม่พบหมวดหมู่');
    }
  }
}
