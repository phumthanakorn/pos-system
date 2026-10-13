import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateShopDto } from './dto/update-shop.dto.js';
import { parseLoyalty } from '../../common/helpers/loyalty.js';
import { UpdateLoyaltyDto } from './dto/update-loyalty.dto.js';
import { UpdateReceiptDto } from './dto/update-receipt.dto.js';
import { UpdateTaxDto } from './dto/update-tax.dto.js';

const KEY_TAX_ID = 'tax_id';
const KEY_RECEIPT_FOOTER = 'receipt_footer';
const KEY_RECEIPT_OPTIONS = 'receipt_options';
const KEY_LOYALTY = 'loyalty';
export const DEFAULT_RECEIPT = {
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showTaxId: true,
  showOrderNumber: true,
  showUnitPrice: true,
  paperWidth: 80 as 58 | 80,
  headerNote: '',
};
type ReceiptOptions = typeof DEFAULT_RECEIPT;

// Stored as one JSON blob per shop; anything missing or malformed falls back to the defaults.
function parseReceipt(raw: string | undefined): ReceiptOptions {
  if (!raw) return { ...DEFAULT_RECEIPT };
  try {
    return { ...DEFAULT_RECEIPT, ...(JSON.parse(raw) as Partial<ReceiptOptions>) };
  } catch {
    return { ...DEFAULT_RECEIPT };
  }
}

const DEFAULT_TAX = { name: 'VAT', rate: 7, isInclusive: true };

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(shopId: number) {
    const [shop, tax, extras] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: shopId } }),
      this.prisma.taxSetting.findFirst({ where: { shopId }, orderBy: { id: 'asc' } }),
      this.prisma.setting.findMany({ where: { shopId, key: { in: [KEY_TAX_ID, KEY_RECEIPT_FOOTER, KEY_RECEIPT_OPTIONS, KEY_LOYALTY] } } }),
    ]);
    if (!shop) {
      throw new NotFoundException('ไม่พบร้าน');
    }
    const extra = new Map(extras.map((row) => [row.key, row.value]));
    return {
      shop: {
        name: shop.name,
        type: shop.type,
        hasDineIn: shop.hasDineIn,
        phone: shop.phone ?? '',
        address: shop.address ?? '',
        logoAbbr: shop.logoAbbr ?? '',
        logoUrl: shop.logoUrl,
        taxId: extra.get(KEY_TAX_ID) ?? '',
        receiptFooter: extra.get(KEY_RECEIPT_FOOTER) ?? '',
      },
      receipt: parseReceipt(extra.get(KEY_RECEIPT_OPTIONS)),
      loyalty: parseLoyalty(extra.get(KEY_LOYALTY)),
      tax: tax
        ? { enabled: tax.isActive, name: tax.name, rate: Number(tax.rate), isInclusive: tax.isInclusive }
        : { enabled: false, ...DEFAULT_TAX },
    };
  }

  async updateShop(shopId: number, dto: UpdateShopDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.shop.update({
        where: { id: shopId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.hasDineIn !== undefined && { hasDineIn: dto.hasDineIn }),
          ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
          ...(dto.address !== undefined && { address: dto.address.trim() || null }),
          ...(dto.logoAbbr !== undefined && { logoAbbr: dto.logoAbbr.trim() || null }),
        },
      });
      for (const [key, value] of [
        [KEY_TAX_ID, dto.taxId],
        [KEY_RECEIPT_FOOTER, dto.receiptFooter],
      ] as const) {
        if (value === undefined) continue;
        await tx.setting.upsert({
          where: { shopId_key: { shopId, key } },
          create: { shopId, key, value: value.trim() },
          update: { value: value.trim() },
        });
      }
    });
    return this.get(shopId);
  }

  // Returns the previous logo url so the caller can delete the old file after the swap succeeded
  async setLogo(shopId: number, url: string | null) {
    const shop = await this.prisma.shop.findUniqueOrThrow({ where: { id: shopId }, select: { logoUrl: true } });
    await this.prisma.shop.update({ where: { id: shopId }, data: { logoUrl: url } });
    return { previousUrl: shop.logoUrl, settings: await this.get(shopId) };
  }

  async updateReceipt(shopId: number, dto: UpdateReceiptDto) {
    const row = await this.prisma.setting.findUnique({ where: { shopId_key: { shopId, key: KEY_RECEIPT_OPTIONS } } });
    // DTO class fields can exist as own `undefined` properties; only apply the ones actually sent
    const patch = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    const next: ReceiptOptions = Object.assign(parseReceipt(row?.value), patch);
    next.headerNote = next.headerNote.trim();
    const value = JSON.stringify(next);
    await this.prisma.setting.upsert({
      where: { shopId_key: { shopId, key: KEY_RECEIPT_OPTIONS } },
      create: { shopId, key: KEY_RECEIPT_OPTIONS, value },
      update: { value },
    });
    return this.get(shopId);
  }

  async updateLoyalty(shopId: number, dto: UpdateLoyaltyDto) {
    const row = await this.prisma.setting.findUnique({ where: { shopId_key: { shopId, key: KEY_LOYALTY } } });
    const patch = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    const value = JSON.stringify(Object.assign(parseLoyalty(row?.value), patch));
    await this.prisma.setting.upsert({
      where: { shopId_key: { shopId, key: KEY_LOYALTY } },
      create: { shopId, key: KEY_LOYALTY, value },
      update: { value },
    });
    return this.get(shopId);
  }

  async updateTax(shopId: number, dto: UpdateTaxDto) {
    const existing = await this.prisma.taxSetting.findFirst({ where: { shopId }, orderBy: { id: 'asc' } });
    const data = {
      isActive: dto.enabled,
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.rate !== undefined && { rate: dto.rate }),
      ...(dto.isInclusive !== undefined && { isInclusive: dto.isInclusive }),
    };
    if (existing) {
      await this.prisma.taxSetting.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.taxSetting.create({
        data: {
          shopId,
          name: dto.name?.trim() || DEFAULT_TAX.name,
          rate: dto.rate ?? DEFAULT_TAX.rate,
          isInclusive: dto.isInclusive ?? DEFAULT_TAX.isInclusive,
          isActive: dto.enabled,
        },
      });
    }
    return this.get(shopId);
  }
}
