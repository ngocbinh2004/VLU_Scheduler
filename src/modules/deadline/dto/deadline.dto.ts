import {
  DeadlineConstant,
  DeadlineType,
} from '../../../common/deadline.constant';
import { IsBoolean, IsDate, IsEnum, IsOptional } from 'class-validator';
import { CourseValueEntity } from '../../courseValue/entity/courseValue.entity';
import { UserEntity } from '../../user/entity/user.entity';

export class DeadlineDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(DeadlineType)
  deadlineType: DeadlineType;

  @IsOptional()
  @IsEnum(DeadlineConstant)
  priority?: DeadlineConstant;

  description: string;

  @IsDate()
  date: Date;

  courseValueId: number;

  userId: number;
}
