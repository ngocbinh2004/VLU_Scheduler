import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadlineEntity } from './entity/deadline.entity';
import { DeadlineService } from './service/deadline.service';
import { DeadlineController } from './controller/deadline.controller';
import { CourseValueService } from '../courseValue/service/courseValue.service';
import { CourseValueEntity } from '../courseValue/entity/courseValue.entity';
import { TracingLoggerService } from '../../logger/tracing-logger.service';
import { UserService } from '../user/service/user.service';
import { UserEntity } from '../user/entity/user.entity';
import {NoteService} from "../note/service/note.service";
import {NoteEntity} from "../note/entity/note.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([DeadlineEntity, CourseValueEntity, UserEntity, NoteEntity]),
  ],
  controllers: [DeadlineController],
  providers: [
    DeadlineService,
    CourseValueService,
    TracingLoggerService,
    UserService,
    NoteService
  ],
})
export class DeadlineModule {}
