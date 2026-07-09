import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadEnv } from '@app/common';

loadEnv();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5433),
      username: process.env.DB_USERNAME || 'balii_admin',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_DATABASE || 'balii_sleepwear',

      synchronize: false,
      logging: true,

      entities: [],
      autoLoadEntities: true,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
