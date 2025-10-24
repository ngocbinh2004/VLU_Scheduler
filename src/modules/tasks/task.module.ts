import { Module } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SyncModule } from '../sync/sync.module';
import { TaskService } from './task.service';
import { SyncDataService } from '../sync/service/sync-data.service';
import { SYNC_DATA_SERVICE } from '../sync/utils/sync.constant';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncEventEntity } from '../sync/entities/sync-event.entity';
import { UserEntity } from '../user/entity/user.entity';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../../auth/auth.module';
import { CoursesModule } from '../courses/course.module';
import { CourseValueModule } from '../courseValue/courseValue.module';
import { SchedulerTemplateEntity } from '../schedulerTemplate/entity/schedulerTemplate.entity';
import { SyncRealTimeEntity } from '../sync/entities/sync-real-time.entity';
import { ScheduleTemplateService } from '../schedulerTemplate/service/scheduleTemplate.service';
import { CoursePositionService } from '../coursePosition/service/coursePosition.service';
import { CoursePositionEntity } from '../coursePosition/entity/coursePosition.entity';
import { CoursePositionModule } from '../coursePosition/coursePosition.module';
import { ScheduleTemplateModule } from '../schedulerTemplate/scheduleTemplate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SyncEventEntity,
      SchedulerTemplateEntity,
      SyncRealTimeEntity,
      UserEntity,
      CoursePositionEntity,
    ]),
    SyncModule,
    UserModule,
    AuthModule,
    CoursesModule,
    CourseValueModule,
    CoursePositionModule,
    ScheduleTemplateModule,
  ],
  providers: [SchedulerRegistry, TaskService],
  exports: [SchedulerRegistry, TaskService],
})
export class TaskModule {}
