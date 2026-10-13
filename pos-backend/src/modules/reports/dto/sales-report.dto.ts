import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SalesReportQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  to?: string;
}
