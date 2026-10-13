import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { UsersService } from './users.service.js';

@UseGuards(AuthGuard, RolesGuard)
@Roles('owner', 'manager')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.list(requireShopId(req.user));
  }

  @Post()
  create(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateStaffDto) {
    return this.usersService.create(requireShopId(req.user), req.user, dto);
  }

  @Patch(':id')
  update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.usersService.update(requireShopId(req.user), req.user, id, dto);
  }
}
