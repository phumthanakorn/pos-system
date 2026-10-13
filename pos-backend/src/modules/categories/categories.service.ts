import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(shopId: number) {
    return this.prisma.category.findMany({
      where: { shopId },
      select: { id: true, name: true, _count: { select: { products: true } } },
      orderBy: { id: 'asc' },
    }).then((rows) => rows.map((row) => ({ id: row.id, name: row.name, productCount: row._count.products })));
  }

  create(shopId: number, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { shopId, name: dto.name.trim() },
      select: { id: true, name: true },
    });
  }

  async update(shopId: number, id: number, dto: UpdateCategoryDto) {
    await this.assertOwned(shopId, id);
    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name.trim() },
      select: { id: true, name: true },
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
