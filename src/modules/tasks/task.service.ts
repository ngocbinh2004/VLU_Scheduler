import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TasksRule } from './task.rules';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SyncDataService } from '../sync/service/sync-data.service';
import { CronJob } from 'cron';
import { SYNC_DATA_SERVICE } from '../sync/utils/sync.constant';

@Injectable()
export class TaskService implements OnModuleInit {
  private readonly logger: Logger;
  private readonly rules: TasksRule[] = [];
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(SYNC_DATA_SERVICE)
    private readonly syncService: SyncDataService,
  ) {
    this.logger = new Logger(TaskService.name);
    this.addRule({
      ruleName: 'Auto Sync Scheduler when create new user',
      cronExpression: '*/2 * * * *',
      execute: this.syncSchedulerRealTime.bind(this),
    });

    this.addRule({
      ruleName: 'Auto Sync Update in sunday',
      cronExpression: `0 0 * * * `,
      execute: this.syncUpdateScheduler.bind(this),
    });
  }

  async syncUpdateScheduler() {
    this.logger.debug('Sync Update Scheduler');
    await this.syncService.processSyncSchedulerData();
    this.logger.debug('Sync Update Scheduler Successfully');
  }

  async syncSchedulerRealTime() {
    this.logger.debug(`Start to get scheduler real time`);
    await this.syncService.processingSyncRealtime();
    this.logger.debug(`Finish execute task`);
  }
  addRule(rule: TasksRule) {
    this.rules.push(rule);
  }

  onModuleInit(): any {
    this.rules.forEach((rule) => {
      const job = new CronJob(rule.cronExpression, async () => {
        this.logger.debug('Executing rule: ' + rule.ruleName);
        await rule.execute();
      });
      this.schedulerRegistry.addCronJob(rule.ruleName, job);
      job.start();
      this.logger.log(
        `Scheduled rule: ${rule.ruleName} with cron: ${rule.cronExpression}`,
      );
    });
  }
}
