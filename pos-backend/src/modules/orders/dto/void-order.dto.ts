import { IsString, MaxLength, MinLength } from 'class-validator';

export class VoidOrderDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason: string;
}
