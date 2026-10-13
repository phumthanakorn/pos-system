import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class ReorderCategoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids: number[];
}
