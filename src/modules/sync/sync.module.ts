import { Module, OnModuleInit } from '@nestjs/common';
import { SyncDataService } from './service/sync-data.service';
import { SyncController } from './controller/sync.controller';
import { HttpModule } from '@nestjs/axios';
import { UserService } from '../user/service/user.service';
import { AuthService } from '../../auth/auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncEventEntity } from './entities/sync-event.entity';
import { UserEntity } from '../user/entity/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ScheduleTemplateService } from '../schedulerTemplate/service/scheduleTemplate.service';
import { SchedulerTemplateEntity } from '../schedulerTemplate/entity/schedulerTemplate.entity';
import { CoursesService } from '../courses/service/courses.service';
import { CoursesEntity } from '../courses/entity/courses.entity';
import { CourseValueService } from '../courseValue/service/courseValue.service';
import { CourseValueEntity } from '../courseValue/entity/courseValue.entity';
import { CoursePositionService } from '../coursePosition/service/coursePosition.service';
import { CoursePositionEntity } from '../coursePosition/entity/coursePosition.entity';
import { SYNC_PROCESSOR, syncPoolConfig } from './service/sync-pool.config';
import { RedisModule } from '../redis/redis.module';
import { SYNC_DATA_SERVICE } from './utils/sync.constant';
import { ModuleRef } from '@nestjs/core';
import { SyncRealTimeEntity } from './entities/sync-real-time.entity';
import { TracingLoggerService } from '../../logger/tracing-logger.service';
import { RedisHelper } from '../redis/service/redis.service';
import { ConfigService } from '@nestjs/config';
import { TracingLoggerModule } from '../../logger/tracinglogger.module';
import { NoteModule } from "../note/note.module";

@Module({
  imports: [
    RedisModule,
    HttpModule,
    TracingLoggerModule,
    TypeOrmModule.forFeature([
      SyncEventEntity,
      UserEntity,
      SchedulerTemplateEntity,
      CoursesEntity,
      CourseValueEntity,
      CoursePositionEntity,
      SyncRealTimeEntity,
    ]),
    NoteModule,
  ],
  controllers: [SyncController],
  providers: [
    UserService,
    AuthService,
    JwtService,
    ScheduleTemplateService,
    CoursesService,
    CourseValueService,
    TracingLoggerService,
    RedisHelper,
    ConfigService,
    SyncDataService,
    CoursePositionService,
    {
      provide: SYNC_DATA_SERVICE,
      useClass: SyncDataService,
    },
    ...syncPoolConfig,
    CoursePositionService,
  ],
  exports: [SYNC_DATA_SERVICE, ...syncPoolConfig],
})
export class SyncModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef, // Dependency inject ModuleRef
  ) {}
  async onModuleInit(): Promise<void> {
    await this.moduleRef.get(SYNC_PROCESSOR, { strict: false });
  }
}
