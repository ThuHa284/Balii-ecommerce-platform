import { Module } from '@nestjs/common';
import { RedisModule } from '@app/redis';
import { CartController } from './cart-service.controller';
import { CartService } from './cart-service.service';
import { HttpModule } from '@nestjs/axios';
import { ProductClientService } from './clients/product-client.service';
import { InternalServiceGuard } from './auth/internal-service.guard';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [RedisModule, HttpModule, DatabaseModule],
  controllers: [CartController],
  providers: [CartService, ProductClientService, InternalServiceGuard],
})
export class CartServiceModule {}
