import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  yieldPercent?: number;

  @IsOptional()
  @IsString()
  purchaseUnit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseQty?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number | null;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
