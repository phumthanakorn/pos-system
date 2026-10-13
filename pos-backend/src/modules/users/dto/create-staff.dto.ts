import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsIn(['cashier', 'manager'])
  role: 'cashier' | 'manager';
}
