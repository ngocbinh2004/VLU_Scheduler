import { UserEntity } from '../../user/entity/user.entity';
import { CreateTemplateItemDto } from './createTemplateItem.dto';

export class SchedulerTemplateDto {
  templateId: number;

  studentId: string;

  listOfCourses: CreateTemplateItemDto[];

  isSynced?: boolean;
  isMainTemplate?: boolean;
  lastSyncTime?: Date;
  user: UserEntity;
}
