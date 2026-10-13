import { IsIn, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CashMovementDto {
  @IsIn(['in', 'out'])
  type: 'in' | 'out';

  @IsNumber()
  @Min(0.01)
  @Max(10000000)
  amount: number;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason: string;
}
