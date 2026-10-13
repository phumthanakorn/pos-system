import { IsOptional, IsString, Matches } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto.js';

export class ListOrdersDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^(open|paid|cancelled)(,(open|paid|cancelled))*$/, { message: 'status ไม่ถูกต้อง' })
  status?: string;
}
