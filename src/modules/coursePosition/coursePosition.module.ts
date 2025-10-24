import { forwardRef, Module } from '@nestjs/common';
import { CoursePositionService } from './service/coursePosition.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursePositionEntity } from './entity/coursePosition.entity';
import { ScheduleTemplateModule } from '../schedulerTemplate/scheduleTemplate.module';
import { CoursesModule } from '../courses/course.module';
import { TracingLoggerService } from '../../logger/tracing-logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoursePositionEntity]),
    forwardRef(() => ScheduleTemplateModule),
    forwardRef(() => CoursesModule),
  ],
  controllers: [],
  providers: [CoursePositionService, TracingLoggerService],
  exports: [TypeOrmModule, CoursePositionService],
})
export class CoursePositionModule {}
