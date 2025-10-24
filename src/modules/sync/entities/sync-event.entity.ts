import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entity/user.entity';

@Entity('sync_events')
export class SyncEventEntity {
  @PrimaryGeneratedColumn({ name: 'sync_id' })
  id: number;

  @Column({ name: 'sync_event', type: 'varchar', length: 255 })
  syncEvent: string;

  @Column({ name: 'sync_start_time' })
  startTime: Date;

  @Column({ name: 'sync_finish_time' })
  finishTime: Date;

  @Column({ name: 'sync_status' })
  status: boolean;

  @Column({
    name: 'sync_fail_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  failReason?: string;

  @Column({ name: 'is_new', type: 'boolean', default: true })
  isNew: boolean;

  @ManyToOne(() => UserEntity, (user) => user.syncEvents)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
