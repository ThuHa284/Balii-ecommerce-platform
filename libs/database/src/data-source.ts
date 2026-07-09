import { loadEnv } from '@app/common';
import { DataSource } from 'typeorm';

loadEnv();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5433),
  username: process.env.DB_USERNAME || 'balii_admin',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'balii_sleepwear',

  synchronize: false,
  logging: true,

  entities: ['apps/**/*.entity{.ts,.js}'],
  migrations: ['libs/database/src/migrations/*{.ts,.js}'],
});

export default AppDataSource;
