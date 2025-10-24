import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserSettingInfo } from './user-info.entity';
import { SchedulerTemplateEntity } from '../../schedulerTemplate/entity/schedulerTemplate.entity';
import { SyncEventEntity } from '../../sync/entities/sync-event.entity';
import { DeadlineEntity } from '../../deadline/entity/deadline.entity';

@Entity('student_users')
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ name: 'student_id' })
  studentID: string;

  @OneToOne(
    () => UserSettingInfo,
    (userSettingInfo: UserSettingInfo) => userSettingInfo.user,
  )
  userSettingInfo: UserSettingInfo;

  @OneToMany(() => SchedulerTemplateEntity, (scheduler) => scheduler.user)
  scheduler: SchedulerTemplateEntity[];

  @OneToMany(() => DeadlineEntity, (deadlines) => deadlines.user)
  deadlines: DeadlineEntity[];

  @OneToMany(() => SyncEventEntity, (syncEvents) => syncEvents.user)
  syncEvents: SyncEventEntity[];
}
