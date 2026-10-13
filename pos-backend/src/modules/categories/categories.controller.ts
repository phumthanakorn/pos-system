import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@UseGuards(AuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Req() req: { user: AuthenticatedUser }) {
    return this.categoriesService.findAll(requireShopId(req.user));
  }

  @Roles('owner', 'manager')
  @Post()
  create(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(requireShopId(req.user), dto);
  }

  @Roles('owner', 'manager')
  @Patch('reorder')
  reorder(@Req() req: { user: AuthenticatedUser }, @Body() dto: ReorderCategoriesDto) {
    return this.categoriesService.reorder(requireShopId(req.user), dto.ids);
  }

  @Roles('owner', 'manager')
  @Patch(':id')
  update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(requireShopId(req.user), id, dto);
  }

  @Roles('owner', 'manager')
  @Delete(':id')
  remove(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(requireShopId(req.user), id);
  }
}
