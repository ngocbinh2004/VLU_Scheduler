import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SyncDataService } from '../service/sync-data.service';
import { SessionIdSyncDto } from '../dto/sync.dto';
import { AdminGuard } from '../../../auth/guard/admin.guard';
import { TracingLoggerService } from '../../../logger/tracing-logger.service';
import { SYNC_DATA_SERVICE } from '../utils/sync.constant';

@Controller('sync')
export class SyncController {
  constructor(
    @Inject(SYNC_DATA_SERVICE)
    private readonly syncService: SyncDataService,
    private readonly logger: TracingLoggerService,
  ) {}

  @UseGuards(AdminGuard)
  @Post('redis')
  getDataSynced(@Body() sessionIdDto: SessionIdSyncDto) {
    try {
      return this.syncService.saveSessionIdToCache(sessionIdDto);
    } catch (error) {
      this.logger.debug('input sync session fail ' + error);
      throw new BadRequestException('Invalid Session Id');
    }
  }

  @Post('roadmap')
  syncDataFromRoadMap() {
    try {
      return this.syncService.syncDataFromRoadMap();
    } catch (error) {
      this.logger.debug('syncDataFromRoadMap have error');
      throw new BadRequestException('Cant sync data from roadmap');
    }
  }

  @Post('schedule')
  syncDataFromSchedule(@Query('id') id?: string) {
    try {
      const stdentIds = id?.split(',');
      return this.syncService.processSyncSchedulerData(stdentIds);
    } catch (error) {
      this.logger.debug('syncDataFromSchedule have error ');
      throw new BadRequestException('Cant sync data from schedule');
    }
  }

  @Post('syncRealtime')
  syncRealTime() {
    return this.syncService.processingSyncRealtime();
  }

  @Get('jobCount')
  getJobCount() {
    return this.syncService.getJobCount();
  }
}
