import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { IngredientCategoryDto } from './dto/ingredient-category.dto.js';
import { ListIngredientsDto } from './dto/list-ingredients.dto.js';
import { CreateIngredientDto } from './dto/ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { InventoryService } from './inventory.service.js';

@UseGuards(AuthGuard, RolesGuard)
@Roles('owner', 'manager')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('categories')
  listCategories(@Req() req: { user: AuthenticatedUser }) {
    return this.inventoryService.listCategories(requireShopId(req.user));
  }

  @Post('categories')
  createCategory(@Req() req: { user: AuthenticatedUser }, @Body() dto: IngredientCategoryDto) {
    return this.inventoryService.createCategory(requireShopId(req.user), dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IngredientCategoryDto,
  ) {
    return this.inventoryService.updateCategory(requireShopId(req.user), id, dto);
  }

  @Delete('categories/:id')
  removeCategory(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.removeCategory(requireShopId(req.user), id);
  }

  @Get('ingredients')
  listIngredients(@Req() req: { user: AuthenticatedUser }, @Query() query: ListIngredientsDto) {
    return this.inventoryService.listIngredients(requireShopId(req.user), query);
  }

  @Post('ingredients')
  createIngredient(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(requireShopId(req.user), dto);
  }

  @Patch('ingredients/:id')
  updateIngredient(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.inventoryService.updateIngredient(requireShopId(req.user), id, dto);
  }

  @Delete('ingredients/:id')
  removeIngredient(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.removeIngredient(requireShopId(req.user), id);
  }
}
