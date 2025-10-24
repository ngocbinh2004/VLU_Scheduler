import { DeadlineService } from '../service/deadline.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { DeadlineDto } from '../dto/deadline.dto';

@Controller('deadline')
export class DeadlineController {
  constructor(private readonly deadlineService: DeadlineService) {}

  @Post('create')
  createNewDeadline(@Body() deadlineDto: DeadlineDto) {
    return this.deadlineService.createDeadline(deadlineDto);
  }

  @Patch('/:id')
  activeAlert(@Body('isActive') isActive: boolean, @Param('id') id: number) {
    return this.deadlineService.activeAlert(isActive, id);
  }

  @Get('/detail/:id')
  getDeadlineById(@Param('id') id: number) {
    return this.deadlineService.getDeadlineById(id);
  }

  @Get('by-course-value/:courseValueId')
  getDeadlineByCourseValueId(@Param('courseValueId') courseValueId: number) {
    return this.deadlineService.getDeadlineByCourseValueId(courseValueId);
  }

  @Delete('delete/:id')
  deleteDeadline(@Param('id') id: number) {
    return this.deadlineService.deleteDeadline(id);
  }
}
