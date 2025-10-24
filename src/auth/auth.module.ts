import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleTemplateModule } from '../modules/schedulerTemplate/scheduleTemplate.module';
import { TracingLoggerModule } from '../logger/tracinglogger.module';
import { TracingLoggerService } from '../logger/tracing-logger.service';
import { EmailValidationHelper } from '../modules/validation/service/email-validation.helper';
import { RedisModule } from '../modules/redis/redis.module';
import * as process from 'process';
import { SchedulerTemplateEntity } from '../modules/schedulerTemplate/entity/schedulerTemplate.entity';
import { SyncDataService } from '../modules/sync/service/sync-data.service';
import { SyncRealTimeEntity } from '../modules/sync/entities/sync-real-time.entity';
import { SyncEventEntity } from '../modules/sync/entities/sync-event.entity';
import { SyncModule } from '../modules/sync/sync.module';
import { CoursesModule } from '../modules/courses/course.module';
import { CoursesService } from '../modules/courses/service/courses.service';
import { CourseValueService } from '../modules/courseValue/service/courseValue.service';
import { CourseValueEntity } from '../modules/courseValue/entity/courseValue.entity';
import { UserModule } from '../modules/user/user.module';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategy/local.strategy';
import { UserService } from '../modules/user/service/user.service';
import { UserEntity } from '../modules/user/entity/user.entity';
import { JwtStrategy } from './strategy/jwt.strategy';
import { RefreshTokenStrategy } from './strategy/refreshToken.strategy';
import { AuthController } from './auth.controller';
import { CoursePositionService } from '../modules/coursePosition/service/coursePosition.service';
import { CoursePositionEntity } from '../modules/coursePosition/entity/coursePosition.entity';
import {NoteModule} from "../modules/note/note.module";

@Module({
  imports: [
    PassportModule,
    UserModule,
    TracingLoggerModule,
    ScheduleTemplateModule,
    RedisModule,
    SyncModule,
    CoursesModule,
    NoteModule,
    JwtModule.register({
      secret: `${process.env.SECRETEKEY}`,
      signOptions: { expiresIn: '300s' },
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      SchedulerTemplateEntity,
      SyncRealTimeEntity,
      SyncEventEntity,
      CourseValueEntity,
      CoursePositionEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    RefreshTokenStrategy,
    UserService,
    TracingLoggerService,
    EmailValidationHelper,
    {
      provide: 'sync_pool_name',
      useValue: 'your_sync_pool_name',
    },
    SyncDataService,
    CoursesService,
    CourseValueService,
    CoursePositionService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
