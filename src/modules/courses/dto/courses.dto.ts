import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CoursesDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  credits?: number;

  courseCode: string;

  isNew?: boolean;
}
