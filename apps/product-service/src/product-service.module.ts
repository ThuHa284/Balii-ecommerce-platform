import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadEnv } from '@app/common';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CategoriesModule } from './categories/categories.module';
import { CollectionsModule } from './collections/collections.module';
import { ProductImagesModule } from './product-images/product-images.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { ProductsModule } from './products/products.module';

loadEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5433),
      username: process.env.DB_USERNAME || 'balii_admin',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_DATABASE || 'balii_sleepwear',

      autoLoadEntities: true,
      synchronize: false,
      logging: true,
    }),
    ProductsModule,
    ProductVariantsModule,
    CategoriesModule,
    ProductImagesModule,
    CampaignsModule,
    CollectionsModule,
  ],
  exports: [TypeOrmModule],
})
export class ProductServiceModule {}
