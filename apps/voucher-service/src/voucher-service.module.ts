import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadEnv } from '@app/common';
import { UserVoucher } from './entities/user-voucher.entity';
import { Voucher } from './entities/voucher.entity';
import { VoucherUsage } from './entities/voucher-usage.entity';
import { VoucherServiceController } from './voucher-service.controller';
import { VoucherServiceService } from './voucher-service.service';

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
      schema: 'voucher_service',
      autoLoadEntities: true,
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Voucher, VoucherUsage, UserVoucher]),
  ],
  controllers: [VoucherServiceController],
  providers: [VoucherServiceService],
})
export class VoucherServiceModule {}
