import {
  BadRequestException, forwardRef, Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Like, Repository } from 'typeorm';
import { CourseValueEntity } from '../entity/courseValue.entity';
import { CourseValueDto } from '../dto/courseValue.dto';
import { TracingLoggerService } from '../../../logger/tracing-logger.service';
import { NoteEntity } from '../../note/entity/note.entity';
import { CoursesEntity } from '../../courses/entity/courses.entity';
import { SchedulerTemplateEntity } from '../../schedulerTemplate/entity/schedulerTemplate.entity';
import { LAB_LOCATION_PREFIX } from '../dto/courseValue.constant';
import {NoteService} from "../../note/service/note.service";

@Injectable()
export class CourseValueService {
  constructor(
    @InjectRepository(CourseValueEntity)
    private readonly courseValueRepository: Repository<CourseValueEntity>,
    @Inject(forwardRef(() => NoteService)) private readonly noteService: NoteService,
    private readonly logger: TracingLoggerService,
  ) {
    this.logger.setContext(CourseValueService.name);
  }

  async getAllCourseValues() {
    const response = await this.courseValueRepository.find();
    const courseValues = response.map((courseValue) => ({
      lecture: courseValue.lecture,
      location: courseValue.location,
    }));
    this.logger.debug(
      `[GET COURSE VALUES] Course value length: ${courseValues.length}`,
    );
    return courseValues;
  }

  async getCourseValue(id: number) {
    const existingCourseValue = await this.courseValueRepository.findOne({
      where: { id },
    });
    if (!existingCourseValue) {
      this.logger.debug(
        `[COURSE VALUE] fail to find course value with id: ${id}`,
      );
      throw new NotFoundException('can not found course value');
    }
    return existingCourseValue;
  }

  async createCourseValue(
    courseValueDto: CourseValueDto,
    entityManager?: EntityManager,
  ) {
    try {
      const manager = entityManager || this.courseValueRepository.manager;

      if (
        !courseValueDto.lecture ||
        !courseValueDto.location ||
        !courseValueDto.courses ||
        !courseValueDto.scheduler
      ) {
        throw new BadRequestException(
          'Missing required fields for CourseValue',
        );
      }

      // Tạo thực thể mới
      const newCourseValue = manager.create(CourseValueEntity, {
        lecture: courseValueDto.lecture,
        location: courseValueDto.location,
        courses: courseValueDto.courses,
        scheduler: courseValueDto.scheduler,
      });
      const savedCourseValue = await manager.save(newCourseValue);
      await this.noteService.createNote({
        content: '',
        courseValueId: newCourseValue.id,
      })
      this.logger.debug(
        `[CREATE COURSE VALUE] Created successfully: ${JSON.stringify(
          savedCourseValue,
        )}`,
      );

      return savedCourseValue;
    } catch (error) {
      this.logger.error(
        `[CREATE COURSE VALUE] Failed to create CourseValue: ${error.message}`,
      );
      throw error;
    }
  }

  async existsCourseValue(courseValueDto: CourseValueDto) {
    // query het  [] map courseId -> courseValue
    const existingValue = await this.courseValueRepository.findOne({
      where: {
        courses: courseValueDto.courses,
        lecture: courseValueDto.lecture,
        location: courseValueDto.location,
        scheduler: courseValueDto.scheduler,
      },
    });
    return !!existingValue; // Returns true if a match is found
  }

  async updateCourseValue(courseValueDto: CourseValueDto) {
    let existingCourseValue;
    if (courseValueDto.location.startsWith(LAB_LOCATION_PREFIX) === true) {
      existingCourseValue = await this.courseValueRepository.findOne({
        where: {
          location: Like(LAB_LOCATION_PREFIX),
          courses: courseValueDto.courses,
          scheduler: courseValueDto.scheduler,
        },
      });
    } else {
      existingCourseValue = await this.courseValueRepository.findOne({
        where: {
          courses: courseValueDto.courses,
          scheduler: courseValueDto.scheduler,
        },
      });
    }
    if (!existingCourseValue) {
      return await this.createCourseValue(courseValueDto);
    }

    existingCourseValue.lecture = courseValueDto.lecture;
    existingCourseValue.location = courseValueDto.location;

    this.logger.debug(
      `[UPDATE COURSE VALUE] update course value with course value's ID: ${existingCourseValue.id} successfully!`,
    );
    return await this.courseValueRepository.save(existingCourseValue);
  }

  async deleteCourseValue(
    courseId: number,
    schedulerId: number,
  ): Promise<void> {
    const existingCourseValue = await this.courseValueRepository.findOne({
      where: {
        courses: { id: courseId },
        scheduler: { id: schedulerId },
      },
      relations: ['note'],
    });

    if (!existingCourseValue) {
      throw new NotFoundException('Course value not found');
    }

    // Delete note entity
    if (existingCourseValue.note) {
      await this.courseValueRepository.manager.delete(
        NoteEntity,
        existingCourseValue.note.id,
      );
      this.logger.debug(
        `[DELETE NOTE]Deleted note with ID: ${existingCourseValue.note.id} successfully!`,
      );
    }

    await this.courseValueRepository.delete({ id: existingCourseValue.id });

    this.logger.debug(
      `[DELETE COURSE VALUE]Deleted course value with ID: ${existingCourseValue.id} successfully!`,
    );
  }

  async deleteByTemplateId(
    templateId: number,
    manager: EntityManager,
  ): Promise<void> {
    const courseValues = await manager.find(CourseValueEntity, {
      where: { scheduler: { id: templateId } },
      relations: ['note'],
    });

    if (!courseValues.length) {
      this.logger.debug(`[DELETE BY TEMPLATE ID] No course values found for template ID: ${templateId}`);
      return;
    }

    const noteIds = courseValues
      .map((courseValue) => courseValue.note?.id)
      .filter((id): id is number => !!id);

    if (noteIds.length) {
      await manager.delete(NoteEntity, noteIds);
      this.logger.debug(`[DELETE NOTES] Deleted ${noteIds.length} notes successfully.`);
    }

    const courseValueIds = courseValues.map((courseValue) => courseValue.id);
    await manager.delete(CourseValueEntity, courseValueIds);
    this.logger.debug(`[DELETE COURSE VALUES] Deleted ${courseValueIds.length} course values successfully.`);
  }

}
