import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto.js';

export class ListIngredientsDto extends PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;
}
