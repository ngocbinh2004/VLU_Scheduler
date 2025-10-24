import { poolConfig } from './pool.config';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [poolConfig],
  exports: [poolConfig],
})
export class PoolModule {}
