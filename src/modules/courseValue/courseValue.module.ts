import { CourseValueController } from './controller/courseValue.controller';
import {forwardRef, Module} from '@nestjs/common';
import { CourseValueService } from './service/courseValue.service';
import { CourseValueEntity } from './entity/courseValue.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesEntity } from '../courses/entity/courses.entity';
import { TracingLoggerService } from '../../logger/tracing-logger.service';
import {NoteModule} from "../note/note.module";

@Module({
  imports: [TypeOrmModule.forFeature([CourseValueEntity, CoursesEntity]),
  forwardRef(() => NoteModule),],
  controllers: [CourseValueController],
  providers: [CourseValueService, TracingLoggerService],
  exports: [TypeOrmModule, CourseValueService],
})
export class CourseValueModule {}
