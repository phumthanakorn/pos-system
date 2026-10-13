import { IsIn } from 'class-validator';

export class UpdateKitchenStatusDto {
  @IsIn(['pending', 'preparing', 'ready', 'served'])
  status: 'pending' | 'preparing' | 'ready' | 'served';
}
