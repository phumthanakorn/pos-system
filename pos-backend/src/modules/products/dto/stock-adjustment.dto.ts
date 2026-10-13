import { IsIn, IsNumber, IsString, MaxLength, MinLength, NotEquals } from 'class-validator';

export class StockAdjustmentDto {
  // signed change in quantity: positive adds stock (received, found extra), negative removes it (damaged, lost)
  @IsNumber()
  @NotEquals(0)
  qty: number;

  @IsIn(['purchase', 'adjustment'])
  type: 'purchase' | 'adjustment';

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  note: string;
}
