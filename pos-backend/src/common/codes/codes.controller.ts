import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { Roles } from '../decorators/roles.decorator.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../helpers/require-shop.js';
import { CodesService } from './codes.service.js';

class GenerateCodeQuery {
  @IsIn(['sku', 'barcode'])
  kind: 'sku' | 'barcode';
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('owner', 'manager')
@Controller('codes')
export class CodesController {
  constructor(private readonly codesService: CodesService) {}

  @Get('generate')
  async generate(@Req() req: { user: AuthenticatedUser }, @Query() query: GenerateCodeQuery) {
    return { value: await this.codesService.generate(requireShopId(req.user), query.kind) };
  }
}
