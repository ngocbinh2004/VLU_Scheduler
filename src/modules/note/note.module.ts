import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteEntity } from './entity/note.entity';
import { NoteService } from './service/note.service';
import { NoteController } from './controller/note.controller';
import { TracingLoggerModule } from '../../logger/tracinglogger.module';
import { ScheduleTemplateModule } from '../schedulerTemplate/scheduleTemplate.module';
import { CourseValueModule } from '../courseValue/courseValue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NoteEntity]),
    TracingLoggerModule,
    forwardRef(() => ScheduleTemplateModule),
    forwardRef(() =>CourseValueModule),
  ],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService],
})
export class NoteModule {}
