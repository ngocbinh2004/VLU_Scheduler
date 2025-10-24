import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as process from 'node:process';
dotenv.config();

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST.toString(),
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB.toString(),
  username: process.env.POSTGRES_USER_NAME.toString(),
  password: process.env.POSTGRES_PASSWORD.toString(),
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: true,
};

export default dataSourceOptions;
