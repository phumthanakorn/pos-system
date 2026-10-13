import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { buildInternalBarcode, formatSku } from '../helpers/product-codes.js';
import { nextSequence } from '../helpers/sequence.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type CodeKind = 'sku' | 'barcode';

const MAX_ATTEMPTS = 50;

@Injectable()
export class CodesService {
  constructor(private readonly prisma: PrismaService) {}

  // Returns a code nobody in this shop uses yet (products and ingredients share one namespace so a scan is
  // never ambiguous). It is not reserved: the value only becomes taken when the item is saved.
  async generate(shopId: number, kind: CodeKind): Promise<string> {
    const shop = await this.prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: { logoAbbr: true },
    });

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const seq = await this.prisma.$transaction((tx) =>
        nextSequence(tx, shopId, kind, 'all'),
      );
      const candidate =
        kind === 'sku'
          ? formatSku(shop.logoAbbr, seq)
          : buildInternalBarcode(seq);
      if (!(await this.isTaken(shopId, kind, candidate))) {
        return candidate;
      }
    }
    throw new Error('could not find a free code');
  }

  /**
   * Run inside the same transaction as the product/ingredient write. First it takes a per-shop lock (the
   * counter row stays locked until commit), so two saves for one shop are processed one after the other;
   * then it makes sure the SKU/barcode is not already used by the OTHER table. Same-table duplicates are
   * already rejected by the database unique indexes. Without the lock, two simultaneous saves could both
   * pass this check before either one had written.
   */
  async assertFreeInOtherTable(
    tx: Prisma.TransactionClient,
    shopId: number,
    codes: { sku?: string | null; barcode?: string | null },
    other: 'product' | 'ingredient',
  ): Promise<void> {
    await nextSequence(tx, shopId, 'codelock', 'all');

    const checks: { label: string; field: 'sku' | 'barcode'; value: string }[] =
      [];
    if (codes.sku)
      checks.push({ label: 'SKU ', field: 'sku', value: codes.sku });
    if (codes.barcode)
      checks.push({
        label: 'บาร์โค้ด',
        field: 'barcode',
        value: codes.barcode,
      });

    for (const { label, field, value } of checks) {
      const where = { shopId, [field]: value };
      const hit =
        other === 'product'
          ? await tx.product.findFirst({ where, select: { name: true } })
          : await tx.ingredient.findFirst({ where, select: { name: true } });
      if (hit) {
        const owner = other === 'product' ? 'สินค้า' : 'วัตถุดิบ';
        throw new ConflictException(`${label}นี้ซ้ำกับ${owner} "${hit.name}"`);
      }
    }
  }

  private async isTaken(
    shopId: number,
    kind: CodeKind,
    value: string,
  ): Promise<boolean> {
    const where =
      kind === 'sku' ? { shopId, sku: value } : { shopId, barcode: value };
    const [product, ingredient] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.ingredient.count({ where }),
    ]);
    return product + ingredient > 0;
  }
}
