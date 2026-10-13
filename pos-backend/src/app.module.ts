import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CodesModule } from './common/codes/codes.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { DiscountsPromotionsModule } from './modules/discounts-promotions/discounts-promotions.module.js';
import { TaxModule } from './modules/tax/tax.module.js';
import { ReceiptsModule } from './modules/receipts/receipts.module.js';
import { PrintersModule } from './modules/printers/printers.module.js';
import { ShiftsModule } from './modules/shifts/shifts.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    PrismaModule,
    CodesModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    InventoryModule,
    OrdersModule,
    PaymentsModule,
    DiscountsPromotionsModule,
    TaxModule,
    ReceiptsModule,
    PrintersModule,
    ShiftsModule,
    ReportsModule,
    CustomersModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
