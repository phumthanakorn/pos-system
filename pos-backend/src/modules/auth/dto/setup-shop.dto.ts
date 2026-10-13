import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import type { ShopType } from '@prisma/client';

const SHOP_TYPES: ShopType[] = ['restaurant', 'retail', 'cafe', 'salon', 'nail'];

export class SetupShopDto {
  @IsString()
  @MinLength(1)
  shopName: string;

  @IsEnum(SHOP_TYPES)
  type: ShopType;

  @IsBoolean()
  hasDineIn: boolean;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  logoAbbr?: string;
}
