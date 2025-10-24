import { forwardRef, Module } from '@nestjs/common';
import { CoursesService } from './service/courses.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesEntity } from './entity/courses.entity';
import { CoursePositionModule } from '../coursePosition/coursePosition.module';
import { CourseValueModule } from '../courseValue/courseValue.module';
import { TracingLoggerService } from '../../logger/tracing-logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoursesEntity]),
    forwardRef(() => CoursePositionModule),
    CourseValueModule,
  ],
  controllers: [],
  providers: [CoursesService, TracingLoggerService],
  exports: [TypeOrmModule, CoursesService],
})
export class CoursesModule {}
