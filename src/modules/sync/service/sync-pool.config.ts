import { BULL_CONFIG_OPTION, BullOptions } from '../../pool/pool.constant';
import { Queue, Worker } from 'bullmq';
import { SyncDataService } from './sync-data.service';
import { REDIS_CONFIG } from '../../redis/redis.constant';
import { RedisConfig } from '../../redis/dtos/redis-creation.dto';
import { SYNC_DATA_SERVICE } from '../utils/sync.constant';
import * as os from 'node:os';
import { TracingLoggerService } from '../../../logger/tracing-logger.service';

export const SYNC_POOL_NAME = 'sync_pool_name';
export const SYNC_QUEUE_NAME = 'version';
export const NUMBER_PROCESS = 5;
export const SYNC_PROCESSOR = 'sync_processor';
export const getQueueName = () => {
  return SYNC_QUEUE_NAME;
};
export const syncPoolConfig = [
  {
    provide: SYNC_POOL_NAME,
    inject: [BULL_CONFIG_OPTION, REDIS_CONFIG],
    useFactory: (bullOptions: BullOptions, redisConfig: RedisConfig) => {
      return new Queue('queue', {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.accessKey,
          tls: {},
          retryStrategy(times) {
            return Math.min(times * 50, 2000);
          },
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: true,
          ...bullOptions.defaultConnectionOptions,
        },
      });
    },
  },
  {
    provide: SYNC_PROCESSOR,
    inject: [SYNC_DATA_SERVICE, REDIS_CONFIG],
    useFactory: (processor: SyncDataService, redisConfig: RedisConfig) => {
      return new Worker(
        'queue',
        async (job) => {
          console.log(`Start to process job`);
          const data = job.data;
          console.log(data);
          await processor.syncDataFromSchedule(data.studentId);
        },
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.accessKey,
            tls: {},
            retryStrategy(times) {
              return Math.min(times * 50, 2000);
            },
          },
          concurrency: os.cpus().length,
          limiter: {
            max: 100,
            duration: 1000,
          },
        },
      );
    },
  },
];