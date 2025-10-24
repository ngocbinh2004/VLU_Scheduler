import { Module } from '@nestjs/common';
import { TracingLoggerService } from './tracing-logger.service';
import { AsyncLocalStorage } from 'async_hooks';

@Module({
  providers: [
    TracingLoggerService,
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
  ],
  exports: [TracingLoggerService, AsyncLocalStorage],
})
export class TracingLoggerModule {}
