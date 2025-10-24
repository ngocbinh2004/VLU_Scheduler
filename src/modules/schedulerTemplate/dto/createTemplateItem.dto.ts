import { IsNotEmpty } from 'class-validator';

export class CreateTemplateItemDto {
  @IsNotEmpty()
  courseID: string;
  @IsNotEmpty()
  courseName: string;
  @IsNotEmpty()
  date: string;
  @IsNotEmpty()
  startPeriod: number;
  @IsNotEmpty()
  periodsCount: number;
  @IsNotEmpty()
  credits: number;
  @IsNotEmpty()
  location: string;
  @IsNotEmpty()
  lecturer: string;
  isActive: boolean;
  isLab: boolean;
  @IsNotEmpty()
  isDeleted: boolean;
}
