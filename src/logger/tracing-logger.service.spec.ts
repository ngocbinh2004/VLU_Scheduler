import { Test, TestingModule } from '@nestjs/testing';
import { TracingLoggerService } from './tracing-logger.service';

describe('TracingLoggerService', () => {
  let service: TracingLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TracingLoggerService],
    }).compile();

    service = module.get<TracingLoggerService>(TracingLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
