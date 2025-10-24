import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { RoleType } from '../../../common/user.constant';

@Entity('user_setting_info')
export class UserSettingInfo {
  @PrimaryGeneratedColumn({ name: 'uid' })
  uid: number;

  @Column({ name: 'role', nullable: true })
  role: RoleType;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
