import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { RedisConfig } from './modules/redis/dtos/redis-creation.dto';
import { AuthModule } from './auth/auth.module';
import { ScheduleTemplateModule } from './modules/schedulerTemplate/scheduleTemplate.module';
import { TracingLoggerModule } from './logger/tracinglogger.module';
import { DeadlineModule } from './modules/deadline/deadline.module';
import { PoolModule } from './modules/pool/pool.module';
import { SyncModule } from './modules/sync/sync.module';
import { ValidationModule } from './modules/validation/validation.module';
import { TracingLoggerMiddleware } from './logger/tracing-logger.middleware';
import * as dotenv from 'dotenv';
import { RedisModule } from './modules/redis/redis.module';
import * as process from 'process';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfigAsync } from './config/typeorm.config';
import { HealthModule } from './health/health.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { TaskModule } from './modules/tasks/task.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NoteModule } from './modules/note/note.module';
dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule.register({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      accessKey: process.env.REDIS_ACCESS_KEY,
    } as RedisConfig),
    TypeOrmModule.forRootAsync(typeOrmConfigAsync),
    HealthModule,
    UserModule,
    AuthModule,
    ScheduleTemplateModule,
    TracingLoggerModule,
    DeadlineModule,
    PoolModule,
    SyncModule,
    NoteModule,
    ValidationModule.register({
      abstractAPIKey: process.env.API_KEY_EMAIL_VALIDATION,
      publicEmailValidateAPI: process.env.API_VALIDATE_EMAIL,
      isPublic: true,
    }),
    TaskModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(TracingLoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
