import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateTaxDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rate?: number;

  @IsOptional()
  @IsBoolean()
  isInclusive?: boolean;
}
