import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateLoyaltyDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100000)
  bahtPerPoint?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(100000)
  pointsPerBaht?: number;
}
