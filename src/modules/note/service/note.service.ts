import {forwardRef, Inject, Injectable, NotFoundException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NoteEntity } from '../entity/note.entity';
import { Repository } from 'typeorm';
import { TracingLoggerService } from '../../../logger/tracing-logger.service';
import { NoteDto } from '../dto/note.dto';
import { CourseValueService } from '../../courseValue/service/courseValue.service';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(NoteEntity)
    private readonly noteRepository: Repository<NoteEntity>,
    private readonly logger: TracingLoggerService,
    @Inject(forwardRef(() => CourseValueService)) private readonly courseValueService: CourseValueService,
  ) {
    this.logger.setContext(NoteService.name);
  }

  async getNoteById(id: number) {
    const note = await this.noteRepository.findOne({ where: { id: id } });
    if (!note) {
      this.logger.debug(`[FIND NOTE] can not find note with id: ${id}`);
      throw new NotFoundException();
    }
    return note;
  }

  async getNoteByCourseValueId(courseValueId: number): Promise<NoteEntity> {
    const note = await this.noteRepository.findOne({
      where: { courseValues: { id: courseValueId } },
    });
    if (!note) {
      this.logger.debug(
        `[FIND NOTE] fail to find note of course value with id: ${courseValueId}`,
      );
      throw new NotFoundException(
        'fail to find note of course value with id: ${id}',
      );
    }
    return note;
  }

  async createNote(noteDto: NoteDto) {
    const existingCourseValue = await this.courseValueService.getCourseValue(
      noteDto.courseValueId,
    );
    if (!existingCourseValue) {
      this.logger.debug(
        `[FIND COURSE VALUE] can not find course value with id: ${noteDto.courseValueId}`,
      );
      throw new NotFoundException('Can not find course value');
    }
    const newNote = await this.noteRepository.create({
      content: noteDto.content,
      courseValues: existingCourseValue,
    });
    this.logger.debug(
      `[CREATE DEFAULT NOTE] create new default note for course value with id: ${noteDto.courseValueId}`,
    );
    await this.noteRepository.save(newNote);
    return {
      message: `Created new note for course value with id: ${noteDto.courseValueId} successfully!`,
      newNote: newNote,
    };
  }

  async updateNote(noteDto: NoteDto) {
    const existingCourseValue = await this.courseValueService.getCourseValue(
      noteDto.courseValueId,
    );
    const existingNote = await this.getNoteByCourseValueId(
      noteDto.courseValueId,
    );
    existingNote.content = noteDto.content;
    existingNote.courseValues = existingCourseValue;
    await this.noteRepository.save(existingNote);
    this.logger.debug(
      `[UPDATE NOTE] successfully updating note with note id: ${existingNote.id}`,
    );
    return {
      message: `Updated note with id: ${existingNote.id} for course value with Id: ${noteDto.courseValueId} successfully`,
      existingNote: existingNote,
    };
  }
}
