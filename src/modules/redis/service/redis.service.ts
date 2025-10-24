import { Inject, Injectable } from '@nestjs/common';
import { IOREDIS } from '../redis.constant';
import * as Redis from 'ioredis';

@Injectable()
export class RedisHelper {
  constructor(
    @Inject(IOREDIS)
    private readonly redis: Redis.Redis,
  ) {}

  async get(key: Redis.RedisKey): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: Redis.RedisKey, value: any, ttl?: number): Promise<void> {
    if (ttl && ttl > 0) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  getRedisRaw(): Redis.Redis {
    return this.redis;
  }
}
