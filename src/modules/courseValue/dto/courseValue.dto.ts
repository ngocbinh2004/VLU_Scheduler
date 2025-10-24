import { IsNotEmpty, IsString } from 'class-validator';
import { CoursesEntity } from '../../courses/entity/courses.entity';
import { SchedulerTemplateEntity } from '../../schedulerTemplate/entity/schedulerTemplate.entity';

export class CourseValueDto {

  @IsString()
  @IsNotEmpty()
  lecture: string;

  @IsString()
  @IsNotEmpty()
  location: string;
  courses: CoursesEntity;
  scheduler: SchedulerTemplateEntity;
}
