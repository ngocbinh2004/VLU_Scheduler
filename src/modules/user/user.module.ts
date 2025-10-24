import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSettingInfo } from './entity/user-info.entity';
import { RedisHelper } from '../redis/service/redis.service';
import { TracingLoggerService } from '../../logger/tracing-logger.service';
import { UserController } from './controller/user.controller';
import { UserEntity } from './entity/user.entity';
import { UserService } from './service/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserSettingInfo])],
  controllers: [UserController],
  providers: [UserService, RedisHelper, TracingLoggerService, TypeOrmModule],
  exports: [UserService],
})
export class UserModule {}
