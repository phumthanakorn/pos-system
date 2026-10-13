import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SetupShopDto } from './dto/setup-shop.dto.js';

interface AuthenticatedRequest extends Request {
  user: { id: number; shopId: number | null; email: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Post('setup-shop')
  setupShop(@Req() req: AuthenticatedRequest, @Body() dto: SetupShopDto) {
    return this.authService.setupShop(req.user, dto);
  }
}
