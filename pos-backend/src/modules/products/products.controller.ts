import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MAX_IMAGE_BYTES, deleteImage, saveImage } from '../../common/helpers/image-upload.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto.js';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';

@UseGuards(AuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('sellable')
  findSellable(@Req() req: { user: AuthenticatedUser }) {
    return this.productsService.findSellable(requireShopId(req.user));
  }

  @Roles('owner', 'manager')
  @Get()
  findPage(@Req() req: { user: AuthenticatedUser }, @Query() query: ListProductsDto) {
    return this.productsService.findPage(requireShopId(req.user), query);
  }

  @Roles('owner', 'manager')
  @Post()
  create(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateProductDto) {
    return this.productsService.create(requireShopId(req.user), dto);
  }

  @Roles('owner', 'manager')
  @Patch(':id')
  update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(requireShopId(req.user), id, dto);
  }

  @Roles('owner', 'manager')
  @Get('low-stock')
  lowStock(@Req() req: { user: AuthenticatedUser }) {
    return this.productsService.lowStock(requireShopId(req.user));
  }

  @Roles('owner', 'manager')
  @Post(':id/stock-adjustments')
  adjustStock(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockAdjustmentDto,
  ) {
    return this.productsService.adjustStock(requireShopId(req.user), req.user.id, id, dto);
  }

  @Get(':id/stock-movements')
  stockMovements(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number, @Query() query: PageQueryDto) {
    return this.productsService.stockMovements(requireShopId(req.user), id, query);
  }

  @Delete(':id')
  async remove(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    const shopId = requireShopId(req.user);
    const imageUrl = await this.productsService.remove(shopId, id);
    await deleteImage(imageUrl);
  }

  @Roles('owner', 'manager')
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  async uploadImage(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const shopId = requireShopId(req.user);
    const url = await saveImage(file, 'products');
    try {
      const { view, previousUrl } = await this.productsService.setImage(shopId, id, url);
      await deleteImage(previousUrl);
      return view;
    } catch (error) {
      await deleteImage(url);
      throw error;
    }
  }

  @Roles('owner', 'manager')
  @Delete(':id/image')
  async removeImage(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    const { view, previousUrl } = await this.productsService.setImage(requireShopId(req.user), id, null);
    await deleteImage(previousUrl);
    return view;
  }
}
