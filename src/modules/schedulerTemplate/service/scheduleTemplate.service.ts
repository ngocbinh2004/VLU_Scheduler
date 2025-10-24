import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SchedulerTemplateEntity } from '../entity/schedulerTemplate.entity';
import { DataSource, Like, Repository } from 'typeorm';
import { UserEntity } from '../../user/entity/user.entity';
import { TracingLoggerService } from '../../../logger/tracing-logger.service';
import { plainToInstance } from 'class-transformer';
import { UserService } from '../../user/service/user.service';
import { CoursePositionService } from '../../coursePosition/service/coursePosition.service';
import { CourseValueService } from '../../courseValue/service/courseValue.service';
import { CoursesService } from '../../courses/service/courses.service';
import { SchedulerTemplateDto } from '../dto/scheduler-Template.dto';
import { CreateTemplateItemDto } from '../dto/createTemplateItem.dto';
import { CoursesEntity } from '../../courses/entity/courses.entity';
import { NoteService } from '../../note/service/note.service';
import { IsNotEmpty, IsString } from 'class-validator';
import { LAB_LOCATION_PREFIX } from '../../courseValue/dto/courseValue.constant';
import { startWith } from 'rxjs';
@Injectable()
export class ScheduleTemplateService {
  constructor(
    @InjectRepository(SchedulerTemplateEntity)
    private readonly schedulerTemplateRepo: Repository<SchedulerTemplateEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly datasource: DataSource,
    private readonly logger: TracingLoggerService,
    private readonly userService: UserService,
    private readonly courseValueService: CourseValueService,
    private readonly coursePositonService: CoursePositionService,
    private readonly coursesService: CoursesService,
    private readonly noteService: NoteService,
  ) {
    this.logger.setContext(ScheduleTemplateService.name);
  }

  async findTemplateWithId(id: number) {
    const template = await this.schedulerTemplateRepo.findOne({
      where: { id: id },
    });
    this.logger.debug(
      `[SCHEDULE TEMPLATE] successfully find the template with id: ${id}`,
    );
    return template;
  }

  async generateSchedule(schedulerTemplateDto: SchedulerTemplateDto) {
    // Find student by student ID
    const existedStudent = await this.userService.findUserWithUID(
      schedulerTemplateDto.studentId,
    );

    // If the response template ID is null, create a new template
    if (schedulerTemplateDto.templateId === null) {
      const templateDto = plainToInstance(SchedulerTemplateDto, {
        user: existedStudent,
      });
      const newTemplate = await this.createTemplate(templateDto);
      // Create new course for new template
      for (let i = 0; i < schedulerTemplateDto.listOfCourses.length; i++) {
        const course = schedulerTemplateDto.listOfCourses[i];
        // Validate each component of course => if one of them is null => error
        this.coursesService.validateCourse(course);
        const {
          courseID,
          courseName,
          date,
          startPeriod,
          periodsCount,
          credits,
          location,
          lecturer,
          isLab,
          isDeleted,
        } = course;
        const existedCourse =
          await this.coursesService.findCourseByCourseCode(courseID);
        if (!existedCourse) {
          // Create a new course
          const newCourse = await this.coursesService.createCourse({
            courseCode: courseID,
            name: courseName,
            credits: credits,
            isNew: true,
          });
          // Create a new course position
          await this.coursePositonService.createCoursePos({
            isLab: isLab,
            days: date,
            periods: periodsCount,
            startPeriod: startPeriod,
            scheduler: newTemplate,
            courses: newCourse,
          });
          // Create a new course value
          const newCourseValue =
            await this.courseValueService.createCourseValue({
              lecture: lecturer,
              location: location,
              courses: existedCourse,
              scheduler: newTemplate,
            });
          await this.noteService.createNote({
            content: '',
            courseValueId: newCourseValue.id,
          });
        } else {
          if (isLab === true) {
            // Checking lab course value
            const existingLabCourseVal =
              await this.courseValueService.existsCourseValue({
                lecture: lecturer,
                location: Like(LAB_LOCATION_PREFIX) as unknown as string,
                courses: existedCourse,
                scheduler: newTemplate,
              });
            if (existingLabCourseVal === false) {
              const newCourseValue =
                await this.courseValueService.createCourseValue({
                  lecture: lecturer,
                  location: location,
                  courses: existedCourse,
                  scheduler: newTemplate,
                });
              await this.noteService.createNote({
                content: '',
                courseValueId: newCourseValue.id,
              });
            } else {
              await this.courseValueService.updateCourseValue({
                lecture: lecturer,
                location: location,
                courses: existedCourse,
                scheduler: newTemplate,
              });
            }
            // Checking lab course position
            const existingLabCoursePos =
              await this.coursePositonService.existsCoursePosition({
                isLab: isLab,
                days: date,
                periods: periodsCount,
                startPeriod: startPeriod,
                scheduler: newTemplate,
                courses: existedCourse,
              });
            if (existingLabCoursePos === false) {
              await this.coursePositonService.createCoursePos({
                isLab: isLab,
                days: date,
                periods: periodsCount,
                startPeriod: startPeriod,
                scheduler: newTemplate,
                courses: existedCourse,
              });
            } else {
              await this.coursePositonService.updateCoursePos({
                isLab: isLab,
                days: date,
                periods: periodsCount,
                startPeriod: startPeriod,
                scheduler: newTemplate,
                courses: existedCourse,
              });
            }
          } else {
            await this.courseValueService.updateCourseValue({
              lecture: lecturer,
              location: location,
              courses: existedCourse,
              scheduler: newTemplate,
            });
            await this.coursePositonService.updateCoursePos({
              isLab: isLab,
              days: date,
              periods: periodsCount,
              startPeriod: startPeriod,
              scheduler: newTemplate,
              courses: existedCourse,
            });
          }
        }
      }
      return {
        message: `create new template successfully with templateId: ${newTemplate.id}`,
        newTemplateId: newTemplate.id,
      };
    }
    // If the response template ID is not null
    else {
      const existedTemplate = await this.findTemplateWithId(
        schedulerTemplateDto.templateId,
      );

      // If all courses are marked as deleted, delete all
      const allDeleted = schedulerTemplateDto.listOfCourses.every(
        (course) => course.isDeleted,
      );
      if (allDeleted) {
        await this.deleteAllCourse(
          schedulerTemplateDto.listOfCourses,
          existedTemplate.id,
        );
      } else {
        // Map through listOfCourses and create promises for parallel execution
        for (let i = 0; i < schedulerTemplateDto.listOfCourses.length; i++) {
          const course = schedulerTemplateDto.listOfCourses[i];
          // Validate each component of course => if one of them is null => error
          this.coursesService.validateCourse(course);
          const {
            courseID,
            courseName,
            date,
            startPeriod,
            periodsCount,
            credits,
            location,
            lecturer,
            isLab,
            isDeleted,
          } = course;
          const existedCourse =
            await this.coursesService.findCourseByCourseCode(courseID);
          // If we can  not find one course with the reponse course code (course id)
          if (!existedCourse) {
            // Create a new course
            const newCourse = await this.coursesService.createCourse({
              courseCode: courseID,
              name: courseName,
              credits: credits,
              isNew: true,
            });
            // Create a new course position
            await this.coursePositonService.createCoursePos({
              days: date,
              periods: periodsCount,
              startPeriod: startPeriod,
              scheduler: existedTemplate,
              isLab: null,
              courses: newCourse,
            });
            // Create a new course value
            const newCourseValue =
              await this.courseValueService.createCourseValue({
                lecture: lecturer,
                location: location,
                courses: newCourse,
                scheduler: existedTemplate,
              });
            await this.noteService.createNote({
              content: '',
              courseValueId: newCourseValue.id,
            });
          }
          // If one course can be found by course code
          else {
            if (isLab === true) {
              // Checking lab course value
              const existingLabCourseVal =
                await this.courseValueService.existsCourseValue({
                  lecture: lecturer,
                  location: Like(LAB_LOCATION_PREFIX) as unknown as string,
                  courses: existedCourse,
                  scheduler: existedTemplate,
                });
              if (existingLabCourseVal === false) {
                const newCourseValue =
                  await this.courseValueService.createCourseValue({
                    lecture: lecturer,
                    location: location,
                    courses: existedCourse,
                    scheduler: existedTemplate,
                  });
                await this.noteService.createNote({
                  content: '',
                  courseValueId: newCourseValue.id,
                });
              } else {
                await this.courseValueService.updateCourseValue({
                  lecture: lecturer,
                  location: location,
                  courses: existedCourse,
                  scheduler: existedTemplate,
                });
              }
              // Checking lab course position
              const existingLabCoursePos =
                await this.coursePositonService.existsCoursePosition({
                  isLab: isLab,
                  days: date,
                  periods: periodsCount,
                  startPeriod: startPeriod,
                  scheduler: existedTemplate,
                  courses: existedCourse,
                });
              if (existingLabCoursePos === false) {
                await this.coursePositonService.createCoursePos({
                  isLab: isLab,
                  days: date,
                  periods: periodsCount,
                  startPeriod: startPeriod,
                  scheduler: existedTemplate,
                  courses: existedCourse,
                });
              } else {
                await this.coursePositonService.updateCoursePos({
                  isLab: isLab,
                  days: date,
                  periods: periodsCount,
                  startPeriod: startPeriod,
                  scheduler: existedTemplate,
                  courses: existedCourse,
                });
              }
            } else {
              await this.courseValueService.updateCourseValue({
                lecture: lecturer,
                location: location,
                courses: existedCourse,
                scheduler: existedTemplate,
              });
              await this.coursePositonService.updateCoursePos({
                isLab: isLab,
                days: date,
                periods: periodsCount,
                startPeriod: startPeriod,
                scheduler: existedTemplate,
                courses: existedCourse,
              });
            }
          }
        }
      }
      return {
        message: `update template with template id: ${existedTemplate.id} successfully`,
        templateId: existedTemplate.id,
      };
    }
  }
  // Delete all course
  async deleteAllCourse(
    listOfCourses: CreateTemplateItemDto[],
    shedulerId: number,
  ) {
    const coursesToDelete = listOfCourses.filter(
      (course) => course.isDeleted === true,
    );

    for (let i = 0; i < coursesToDelete.length; i++) {
      const course = coursesToDelete[i];
      const existedCourse = await this.coursesService.findCourseByCourseCode(
        course.courseID,
      );
      if (existedCourse) {
        await this.deleteCourse(existedCourse.id, shedulerId);
      }
    }

    this.logger.debug(
      `[DELETE ALL COURSES] Successfully deleted all courses marked as deleted`,
    );
  }

  async deleteCourse(courseId: number, schedulerId: number) {
    await this.courseValueService.deleteCourseValue(courseId, schedulerId);
    await this.coursePositonService.deleteCoursePos(courseId, schedulerId);
    this.logger.debug(
      `[DELETE COURSE] Successfully deleted course ${courseId}`,
    );
  }

  async createTemplate(templateDto: SchedulerTemplateDto) {
    this.logger.debug('[CREATE TEMPLATE] create template');
    const newTemplate = this.schedulerTemplateRepo.create({
      isSync: templateDto.isSynced,
      isMain: templateDto.isMainTemplate,
      lastSyncTime: templateDto.lastSyncTime,
      user: templateDto.user,
    });
    this.logger.debug('[CREATE TEMPLATE] save template successfully');
    return await this.schedulerTemplateRepo.save(newTemplate);
  }

  async getTemplate(id: number) {
    this.logger.debug(
      `[SCHEDULE TEMPLATE] Get one template information by id ${id}`,
    );

    const templateQuery = `
    SELECT 
        st.scheduler_id,
        st.issynced, 
        st.is_main_template, 
        st.lastsynctime,
        cp.course_position_id,
        cp.days_in_week,
        cp.start_period,
        cp.periods,
        c.course_id,
        c.course_name,
        c.credits,
        c.course_code,
        MAX(CASE 
            WHEN (cp."isLab" = false OR cp."isLab" IS NULL) AND cv_theory.location NOT LIKE 'LA%' 
            THEN cv_theory.course_value_id 
            ELSE null 
        END) AS theory_course_value_id,
        MAX(CASE 
            WHEN (cp."isLab" = false OR cp."isLab" IS NULL) AND cv_theory.location NOT LIKE 'LA%' 
            THEN cv_theory.lecture 
            ELSE null 
        END) AS theory_lecture,
        MAX(CASE 
            WHEN (cp."isLab" = false OR cp."isLab" IS NULL) AND cv_theory.location NOT LIKE 'LA%' 
            THEN cv_theory.location 
            ELSE null 
        END) AS theory_location,
        MAX(CASE 
            WHEN (cp."isLab" = true OR (cp."isLab" IS NULL AND cv_lab.location LIKE 'LA%')) 
            THEN cv_lab.course_value_id 
            ELSE null 
        END) AS lab_course_value_id,
        MAX(CASE 
            WHEN (cp."isLab" = true OR (cp."isLab" IS NULL AND cv_lab.location LIKE 'LA%')) 
            THEN cv_lab.lecture 
            ELSE null 
        END) AS lab_lecture,
        MAX(CASE 
            WHEN (cp."isLab" = true OR (cp."isLab" IS NULL AND cv_lab.location LIKE 'LA%')) 
            THEN cv_lab.location 
            ELSE null 
        END) AS lab_location
    FROM scheduler_template st
    LEFT JOIN course_position cp ON st.scheduler_id = cp."schedulerId"
    LEFT JOIN courses c ON c.course_id = cp."coursesId"
    LEFT JOIN course_value cv_theory 
        ON cv_theory."schedulerId" = st.scheduler_id 
        AND cv_theory."coursesId" = c.course_id
    LEFT JOIN course_value cv_lab 
        ON cv_lab."schedulerId" = st.scheduler_id 
        AND cv_lab."coursesId" = c.course_id
    WHERE st.scheduler_id = $1
    GROUP BY 
        st.scheduler_id, st.issynced, st.is_main_template, st.lastsynctime,
        cp.course_position_id, cp.days_in_week, cp.start_period, cp.periods,
        c.course_id, c.course_name, c.credits, c.course_code;
    `;

    const schedule = await this.datasource.query(templateQuery, [id]);

    return schedule;
  }

  async getAllTemplateIds(userId: number) {
    this.logger.debug('[SCHEDULE TEMPLATE] get all template ids');
    const query =
      'SELECT scheduler_template.scheduler_id FROM scheduler_template JOIN student_users ON scheduler_template."userId" = student_users.id WHERE student_users.id = $1';
    const result = await this.datasource.query(query, [userId]);
    const schedulerTemplateIds = result.map((id) => id.scheduler_id);
    return {
      scheduler_template_ids: schedulerTemplateIds,
    };
  }

  async getAllTemplateBySID(sid: string) {
    this.logger.debug(
      '[SCHEDULE TEMPLATE] Get all template information of one student by student id',
    );
    const existedStudent = await this.userService.findUserWithUID(sid);
    if (!existedStudent) {
      throw new BadRequestException(`user with id: ${sid} not found`);
    }

    const query = `
      SELECT 
        st.issynced, 
        st.is_main_template, 
        st.lastsynctime,
        cp.course_position_id,
        cp.days_in_week,
        cp.start_period,
        cp.periods,
        c.course_id,
        c.course_name,
        c.credits,
        c.course_code,
        cv.course_value_id,
        cv.lecture,
        cv.location
      FROM scheduler_template st
      LEFT JOIN course_position cp ON st.scheduler_id = cp."schedulerId"
      LEFT JOIN courses c ON cp."coursesId" = c.course_id
      LEFT JOIN course_value cv ON cv."coursesId" = c.course_id
      WHERE st."userId" = $1;
    `;
    const schedule = await this.datasource.query(query, [existedStudent.id]);
    return schedule;
  }

  async deleteTemplate(userId: number, schedulerId: number) {
    const existingTemplate = await this.schedulerTemplateRepo.findOne({
      where: {
        id: schedulerId,
        user: { id: userId },
      },
    });
    if (!existingTemplate) {
      this.logger.debug(
        '[SCHEDULE TEMPLATE] fail to find schedule template to delete',
      );
    }
    const deleteCoursePosQuery = `
    DELETE FROM course_position cp
    WHERE cp."schedulerId" = $1
  `;

    await this.datasource.query(deleteCoursePosQuery, [schedulerId]);

    const deleteCourseValQuery = `
    DELETE FROM course_value cv
    WHERE cv."schedulerId" = $1`;

    await this.datasource.query(deleteCourseValQuery, [schedulerId]);

    this.logger.debug(
      `[SCHEDULE TEMPLATE] successfully delete template with id ${schedulerId}`,
    );

    return this.datasource.query(
      `DELETE FROM scheduler_template WHERE "userId" = $1 AND scheduler_id = $2`,
      [userId, schedulerId],
    );
  }

  async getTemplateBySID(sid: string) {
    return await this.datasource
      .getRepository(SchedulerTemplateEntity)
      .createQueryBuilder('scheduler_template')
      .leftJoinAndSelect('scheduler_template.user', 'user') // join bảng 'student_users'
      .where('scheduler_template.is_main_template = true')
      .andWhere('user.studentID = :sid', { sid })
      .getOne();
  }
  async getTemplateMain(id: number) {
    this.logger.debug(
      `[SCHEDULE TEMPLATE] Get one template information by id ${id}`,
    );

    const templateQuery = `
    SELECT 
        st.scheduler_id,
        st.issynced, 
        st.is_main_template, 
        st.lastsynctime,
        cp.course_position_id,
        cp.days_in_week,
        cp.start_period,
        cp.periods,
        c.course_id,
        c.course_name,
        c.credits,
        c.course_code,
        MAX(CASE 
            WHEN (cp."isLab" = false OR cp."isLab" IS NULL) AND cv_theory.location NOT LIKE 'LA%' 
            THEN cv_theory.course_value_id 
            ELSE null 
        END) AS theory_course_value_id,
        MAX(CASE 
            WHEN (cp."isLab" = false OR cp."isLab" IS NULL) AND cv_theory.location NOT LIKE 'LA%' 
            THEN cv_theory.lecture 
            ELSE null 
        END) AS theory_lecture,
        MAX(CASE 
            WHEN (cp."isLab" = false OR cp."isLab" IS NULL) AND cv_theory.location NOT LIKE 'LA%' 
            THEN cv_theory.location 
            ELSE null 
        END) AS theory_location,
        MAX(CASE 
            WHEN (cp."isLab" = true OR (cp."isLab" IS NULL AND cv_lab.location LIKE 'LA%')) 
            THEN cv_lab.course_value_id 
            ELSE null 
        END) AS lab_course_value_id,
        MAX(CASE 
            WHEN (cp."isLab" = true OR (cp."isLab" IS NULL AND cv_lab.location LIKE 'LA%')) 
            THEN cv_lab.lecture 
            ELSE null 
        END) AS lab_lecture,
        MAX(CASE 
            WHEN (cp."isLab" = true OR (cp."isLab" IS NULL AND cv_lab.location LIKE 'LA%')) 
            THEN cv_lab.location 
            ELSE null 
        END) AS lab_location
    FROM scheduler_template st
    LEFT JOIN course_position cp ON st.scheduler_id = cp."schedulerId"
    LEFT JOIN courses c ON c.course_id = cp."coursesId"
    LEFT JOIN course_value cv_theory 
        ON cv_theory."schedulerId" = st.scheduler_id 
        AND cv_theory."coursesId" = c.course_id
    LEFT JOIN course_value cv_lab 
        ON cv_lab."schedulerId" = st.scheduler_id 
        AND cv_lab."coursesId" = c.course_id
    WHERE st.scheduler_id = $1 AND st.is_main_template = true
    GROUP BY 
        st.scheduler_id, st.issynced, st.is_main_template, st.lastsynctime,
        cp.course_position_id, cp.days_in_week, cp.start_period, cp.periods,
        c.course_id, c.course_name, c.credits, c.course_code;
    `;

    const schedule = await this.datasource.query(templateQuery, [id]);

    return schedule;
  }
}
