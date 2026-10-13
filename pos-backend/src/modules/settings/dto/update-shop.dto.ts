import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { ShopType } from '@prisma/client';

const SHOP_TYPES: ShopType[] = ['restaurant', 'retail', 'cafe', 'salon', 'nail'];

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(SHOP_TYPES)
  type?: ShopType;

  @IsOptional()
  @IsBoolean()
  hasDineIn?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  logoAbbr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(13)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  receiptFooter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  promptPayId?: string;
}
