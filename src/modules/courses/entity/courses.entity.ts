import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CoursePositionEntity } from '../../coursePosition/entity/coursePosition.entity';
import { CourseValueEntity } from '../../courseValue/entity/courseValue.entity';

@Entity('courses')
export class CoursesEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'course_id' })
  id: number;

  @Column({ name: 'course_name', nullable: false })
  name: string;

  @Column({ name: 'credits', nullable: false })
  credits: number;

  @Column({
    name: 'course_code',
    nullable: false,
    type: 'varchar',
    length: 255,
    unique: true,
  })
  courseCode: string;

  @Column({ name: 'isNew', nullable: false, type: 'boolean' })
  isNew: boolean;

  @OneToMany(
    () => CoursePositionEntity,
    (coursePosition) => coursePosition.courses,
  )
  coursePosition: CoursePositionEntity[];

  @OneToMany(() => CourseValueEntity, (courseValue) => courseValue.courses, {
    cascade: true,
  })
  courseValues: CourseValueEntity[];
}
