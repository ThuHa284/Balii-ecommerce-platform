import { Module } from '@nestjs/common';
import { RedisModule } from '@app/redis';
import { CartController } from './cart-service.controller';
import { CartService } from './cart-service.service';
import { HttpModule } from '@nestjs/axios';
import { ProductClientService } from './clients/product-client.service';

@Module({
  imports: [RedisModule, HttpModule],
  controllers: [CartController],
  providers: [CartService, ProductClientService],
})
export class CartServiceModule {}
