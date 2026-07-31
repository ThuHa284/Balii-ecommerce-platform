import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDbLogging, getSecuritySecret, loadEnv } from '@app/common';

loadEnv();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5433),
      username: process.env.DB_USERNAME || 'balii_admin',
      password: getSecuritySecret('DB_PASSWORD', '123456'),
      database: process.env.DB_DATABASE || 'balii_sleepwear',

      synchronize: false,
      logging: getDbLogging(),

      entities: [],
      autoLoadEntities: true,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
