import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MAX_IMAGE_BYTES, deleteImage, saveImage } from '../../common/helpers/image-upload.js';
import { Body, Controller, Delete, Get, Patch, Post, UploadedFile, UseInterceptors, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthenticatedUser, requireShopId } from '../../common/helpers/require-shop.js';
import { UpdateShopDto } from './dto/update-shop.dto.js';
import { UpdateLoyaltyDto } from './dto/update-loyalty.dto.js';
import { UpdateReceiptDto } from './dto/update-receipt.dto.js';
import { UpdateTaxDto } from './dto/update-tax.dto.js';
import { SettingsService } from './settings.service.js';

@UseGuards(AuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(@Req() req: { user: AuthenticatedUser }) {
    return this.settingsService.get(requireShopId(req.user));
  }

  @Roles('owner', 'manager')
  @Patch('shop')
  updateShop(@Req() req: { user: AuthenticatedUser }, @Body() dto: UpdateShopDto) {
    return this.settingsService.updateShop(requireShopId(req.user), dto);
  }

  @Roles('owner', 'manager')
  @Post('logo')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  async uploadLogo(@Req() req: { user: AuthenticatedUser }, @UploadedFile() file: Express.Multer.File | undefined) {
    const shopId = requireShopId(req.user);
    const url = await saveImage(file, 'logos');
    try {
      const { previousUrl, settings } = await this.settingsService.setLogo(shopId, url);
      await deleteImage(previousUrl);
      return settings;
    } catch (error) {
      await deleteImage(url);
      throw error;
    }
  }

  @Roles('owner', 'manager')
  @Delete('logo')
  async removeLogo(@Req() req: { user: AuthenticatedUser }) {
    const { previousUrl, settings } = await this.settingsService.setLogo(requireShopId(req.user), null);
    await deleteImage(previousUrl);
    return settings;
  }

  @Roles('owner', 'manager')
  @Patch('receipt')
  updateReceipt(@Req() req: { user: AuthenticatedUser }, @Body() dto: UpdateReceiptDto) {
    return this.settingsService.updateReceipt(requireShopId(req.user), dto);
  }

  @Roles('owner', 'manager')
  @Patch('loyalty')
  updateLoyalty(@Req() req: { user: AuthenticatedUser }, @Body() dto: UpdateLoyaltyDto) {
    return this.settingsService.updateLoyalty(requireShopId(req.user), dto);
  }

  @Roles('owner', 'manager')
  @Patch('tax')
  updateTax(@Req() req: { user: AuthenticatedUser }, @Body() dto: UpdateTaxDto) {
    return this.settingsService.updateTax(requireShopId(req.user), dto);
  }
}
