import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReceiptDto {
  @IsOptional() @IsBoolean() showLogo?: boolean;
  @IsOptional() @IsBoolean() showAddress?: boolean;
  @IsOptional() @IsBoolean() showPhone?: boolean;
  @IsOptional() @IsBoolean() showTaxId?: boolean;
  @IsOptional() @IsBoolean() showOrderNumber?: boolean;
  @IsOptional() @IsBoolean() showUnitPrice?: boolean;

  @IsOptional()
  @IsIn([58, 80])
  paperWidth?: 58 | 80;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  headerNote?: string;
}
