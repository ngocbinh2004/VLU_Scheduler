import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sync_realtime')
export class SyncRealTimeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sync_event' })
  syncEvent: string;

  @Column({ name: 'is_new' })
  isNew: boolean;

  @Column({ name: 'reference_id' })
  referenceId: string;
}
