import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ScheduleTemplateService } from '../service/scheduleTemplate.service';
import { TracingLoggerService } from '../../../logger/tracing-logger.service';
import { SchedulerTemplateDto } from '../dto/scheduler-Template.dto';

@Controller('scheduleTemplate')
export class SchedulerTemplateController {
  constructor(
    private readonly templateService: ScheduleTemplateService,
    private readonly logger: TracingLoggerService,
  ) {
    logger.setContext(SchedulerTemplateController.name);
  }

  @Get(':id')
  getTemplate(@Param('id') id: number) {
    return this.templateService.getTemplate(id);
  }

  @Get('/main/:id')
  getMainTemplate(@Param('id') id: number) {
    return this.templateService.getTemplateMain(id);
  }

  @Get('all/:studentId')
  getAllTemplateBySid(@Param('studentId') studentId: string) {
    return this.templateService.getAllTemplateBySID(studentId);
  }

  @Post('create')
  createTemplate(@Body() templateDto: SchedulerTemplateDto) {
    try {
      this.logger.debug('[CREATE TEMPLATE]: Receive request creating template');
      return this.templateService.createTemplate(templateDto);
    } catch (error) {
      throw new BadRequestException('Cant sync data from schedule');
    }
  }

  @Get('templateIds/:userId')
  getAllTemplateIds(@Param('userId') userId: number) {
    return this.templateService.getAllTemplateIds(userId);
  }

  @Post('createSchedule')
  createScheduler(@Body() schedulerTemplateDto: SchedulerTemplateDto) {
    return this.templateService.generateSchedule(schedulerTemplateDto);
  }
}
