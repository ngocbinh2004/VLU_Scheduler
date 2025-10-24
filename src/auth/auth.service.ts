import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { UserDto } from '../modules/user/dto/user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SigninDto } from '../modules/user/dto/signin.dto';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';

import { SyncDataService } from '../modules/sync/service/sync-data.service';
import { SchedulerTemplateDto } from '../modules/schedulerTemplate/dto/scheduler-Template.dto';
import { UserService } from '../modules/user/service/user.service';
import { UserEntity } from '../modules/user/entity/user.entity';
import { EmailValidationHelper } from '../modules/validation/service/email-validation.helper';
import { RedisHelper } from '../modules/redis/service/redis.service';
import { KEY } from '../common/user.constant';
import { ScheduleTemplateService } from '../modules/schedulerTemplate/service/scheduleTemplate.service';
import { SYNC_EVENT_FROM_SCHEDULE } from '../modules/sync/utils/sync.constant';
import { SyncRealtimeRequestDto } from '../modules/sync/dto/sync-realtime-request.dto';
import { TracingLoggerService } from '../logger/tracing-logger.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly logger: TracingLoggerService,
    private readonly emailValidationHelper: EmailValidationHelper,
    private readonly redisHelper: RedisHelper,
    private readonly schedulerService: ScheduleTemplateService,
    @Inject(forwardRef(() => SyncDataService))
    private readonly syncDataService: SyncDataService,
    private readonly configService: ConfigService,
  ) {
    logger.setContext(AuthService.name);
  }

  async signup(userDto: UserDto) {
    this.logger.debug('sign up');
    const existedUser = await this.userService.findAccountWithEmail(
      userDto.email,
    );
    console.log(userDto);

    if (existedUser) {
      throw new BadRequestException('Email already in use');
    }
    const checkEmailResult = await this.emailValidationHelper.validateEmail(
      userDto.email,
    );
    if (!checkEmailResult) {
      this.logger.debug('Email is not real and fail to validate email');
      throw new BadRequestException('Email is not real email');
    }

    const hashPassword = await bcrypt.hash(userDto.password, 10);
    const newUser = await this.userRepository.create({
      name: userDto.name,
      email: userDto.email,
      password: hashPassword,
      studentID: userDto.student_id,
    });

    const user = await this.userRepository.save(newUser);
    this.logger.debug('[SIGN UP] Save user successfully');

    this.logger.debug('[SIGN UP] Create Dto for template');
    const templateDto = plainToInstance(SchedulerTemplateDto, {
      user: user,
      isMainTemplate: true,
      lastSyncTime: new Date(),
      isSync: true,
    });
    this.logger.debug(
      `[SIGN UP] Create main template for user: ${userDto.student_id}`,
    );
    await this.schedulerService.createTemplate(templateDto);
    this.logger.debug('[SIGN UP] Sync realtime event');
    const syncReq = new SyncRealtimeRequestDto();
    syncReq.syncRealtimeEvent = SYNC_EVENT_FROM_SCHEDULE;
    syncReq.isNew = true;
    syncReq.referenceId = userDto.student_id;

    await this.syncDataService.syncRealtime(syncReq);
    return 'sign up successfully';
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findAccountWithEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async signIn(signInDto: SigninDto) {
    const user = await this.validateUser(signInDto.email, signInDto.password);
    if (!user) {
      throw new BadRequestException('Invalid username or password');
    }
    const payload = {
      username: signInDto.email,
      sub: {
        name: user.name,
        studentId: user.studentID,
      },
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(
      payload,
      user.studentID,
    );

    const redisKey = `user:${user.studentID}:refreshToken`;
    await this.redisHelper.set(redisKey, refreshToken, 604800); // Set for 7 days

    return {
      accessToken,
      refreshToken,
      user_id: user.id,
      studentId: user.studentID,
    };
  }

  async generateRefreshToken(payload: any, studentId: string) {
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  async refreshAccessToken(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken);
    const redisKey = `user:${payload.sub.studentId}:refreshToken`;

    const storedToken = await this.redisHelper.get(redisKey);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newAccessToken = this.jwtService.sign(
      {
        username: payload.username,
        sub: payload.sub,
      },
      { expiresIn: '15m' },
    );

    return { accessToken: newAccessToken };
  }

  async extractUIDFromToken() {
    const token = await this.redisHelper.get(KEY);
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const decoded = await this.jwtService.decode(token);
      return decoded.sub?.studentId;
    } catch (error) {
      this.logger.error('Failed to verify token');
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
