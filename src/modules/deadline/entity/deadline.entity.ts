import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseValueEntity } from '../../courseValue/entity/courseValue.entity';
import { DeadlineType } from '../../../common/deadline.constant';
import { UserEntity } from '../../user/entity/user.entity';
import { DeadlineConstant } from '../../../common/deadline.constant';

@Entity('deadline')
export class DeadlineEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'UID' })
  id: number;

  @Column({ name: 'is_Active', default: false })
  isActive: boolean;

  @Column({
    name: 'deadline_type',
    type: 'enum',
    enum: DeadlineType,
    default: DeadlineType.OTHER,
    nullable: false,
  })
  deadlineType: DeadlineType;

  @Column({ name: 'priority', nullable: true })
  priority: DeadlineConstant;

  @Column({ name: 'description' })
  description: string;

  @Column({ name: 'deadline' })
  deadline: Date;

  @ManyToOne(() => CourseValueEntity, (courseValue) => courseValue.deadlines)
  courseValue: CourseValueEntity;

  @ManyToOne(() => UserEntity, (user) => user.deadlines)
  user: UserEntity;
}
