import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateDiscountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsIn(['percent', 'amount'])
  type: 'percent' | 'amount';

  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  value: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  managerOnly?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
}

export class UpdateDiscountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(['percent', 'amount'])
  type?: 'percent' | 'amount';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  value?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  managerOnly?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
}
