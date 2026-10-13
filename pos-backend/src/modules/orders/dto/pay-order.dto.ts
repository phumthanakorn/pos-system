import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';

export class PayOrderDto {
  @IsIn(['cash', 'card', 'qr'])
  method: 'cash' | 'card' | 'qr';

  @IsOptional()
  @IsNumber()
  @Min(0)
  received?: number;
}
