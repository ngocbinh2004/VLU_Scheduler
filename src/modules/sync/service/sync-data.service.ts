import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { TracingLoggerService } from '../../../logger/tracing-logger.service';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as cheerio from 'cheerio';
import {
  RedisSyncKey,
  SessionPrefix,
  SYNC_EVENT_FROM_ROADMAP,
  SYNC_EVENT_FROM_SCHEDULE,
  SYNC_LOCAL,
  SyncFailReason,
} from '../utils/sync.constant';
import { RedisHelper } from '../../redis/service/redis.service';
import { SessionIdSyncDto } from '../dto/sync.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { SyncEventEntity } from '../entities/sync-event.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SyncRequestDto } from '../dto/sync-request.dto';
import { UserService } from '../../user/service/user.service';
import { AuthService } from '../../../auth/auth.service';
import { RoleType } from '../../../common/user.constant';
import { UserEntity } from '../../user/entity/user.entity';
import { plainToInstance } from 'class-transformer';
import { CoursesService } from '../../courses/service/courses.service';
import { CoursesDto } from '../../courses/dto/courses.dto';
import { CourseValueService } from '../../courseValue/service/courseValue.service';
import { CourseValueDto } from '../../courseValue/dto/courseValue.dto';
import { CoursesEntity } from '../../courses/entity/courses.entity';
import { SYNC_POOL_NAME } from './sync-pool.config';
import { Queue } from 'bullmq';
import { SyncRealTimeEntity } from '../entities/sync-real-time.entity';
import { SyncRealtimeRequestDto } from '../dto/sync-realtime-request.dto';
import { CoursePositionDto } from '../../coursePosition/dto/coursePosition.dto';
import { SchedulerTemplateEntity } from '../../schedulerTemplate/entity/schedulerTemplate.entity';
import { ScheduleTemplateService } from '../../schedulerTemplate/service/scheduleTemplate.service';
import { CoursePositionService } from '../../coursePosition/service/coursePosition.service';
import { CourseValueEntity } from '../../courseValue/entity/courseValue.entity';
import { NoteEntity } from '../../note/entity/note.entity';

@Injectable()
export class SyncDataService {
  private readonly instance: AxiosInstance;
  private readonly username: string;
  private readonly password: string;

  constructor(
    private readonly logger: TracingLoggerService,
    private readonly configService: ConfigService,
    private readonly redisHelper: RedisHelper,
    @InjectRepository(SyncEventEntity)
    private readonly syncRepo: Repository<SyncEventEntity>,
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @Inject(forwardRef(() => CoursesService))
    private readonly courseService: CoursesService,
    private readonly courseValueService: CourseValueService,
    @Inject(SYNC_POOL_NAME) private readonly syncQueue: Queue,
    @InjectRepository(SyncRealTimeEntity)
    private readonly syncRealtimeRepo: Repository<SyncRealTimeEntity>,
    private readonly dataSource: DataSource,
    private readonly schedulerService: ScheduleTemplateService,
    private readonly coursePosService: CoursePositionService,
  ) {
    this.logger.setContext(SyncDataService.name);
    this.instance = axios.create({
      baseURL: this.configService.get<string>('BASE_URL'),
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    this.username = this.configService.get<string>('USERNAME');
    this.password = this.configService.get<string>('PASSWORD');
  }

  async saveSessionIdToCache(sessionIdDto: SessionIdSyncDto) {
    this.logger.debug('[SYNC DATA] Save SessionId from web');
    if (sessionIdDto.sessionId.startsWith(SessionPrefix)) {
      try {
        return await this.redisHelper.set(
          RedisSyncKey,
          sessionIdDto.sessionId,
          60 * 60 * 24,
        );
      } catch (error) {
        this.logger.error('Error saving SessionId to cache');
        throw new InternalServerErrorException(
          'Could not save session ID to cache',
        );
      }
    }
  }

  async createSyncEvent(syncReq: SyncRequestDto) {
    this.logger.debug('[SYNC DATA] check user Id');
    const environment = await this.configService.get('SYNC_ENV');
    this.logger.debug(`[SYNC DATA] environment ${environment}`);
    if (environment === SYNC_LOCAL) {
      const uid = await this.authService.extractUIDFromToken();
      if (!uid) {
        throw new BadRequestException('Invalid UID');
      }
      const user = await this.userService.findUserWithUID(uid);
      syncReq.syncUser = user;
    } else {
      const syncUser = await this.getSyncUser();
      syncReq.syncUser = syncUser;
    }

    const syncEvent = plainToInstance(SyncEventEntity, {
      syncEvent: syncReq.syncEvent,
      startTime: syncReq.startTime,
      finishTime: syncReq.finishTime,
      status: syncReq.status,
      failReason: syncReq.failReason,
      user: syncReq.syncUser,
    });
    await this.syncRepo.save(syncEvent);
    this.logger.debug('[SYNC DATA] Sync event created successfully');
  }

  async syncDataFromRoadMap() {
    const startAt = new Date();
    const checkKey = await this.redisHelper.get(RedisSyncKey);
    this.logger.debug('[SYNC DATA FROM ROAD MAP] check check key');
    const syncReq: SyncRequestDto = <SyncRequestDto>{
      syncEvent: SYNC_EVENT_FROM_ROADMAP,
      startTime: startAt,
    };
    if (!checkKey) {
      syncReq.status = false;
      syncReq.failReason = SyncFailReason.MISS_SESSION_ID;
      await this.createSyncEvent(syncReq);
      this.logger.debug('[SYNC DATA FROM ROAD MAP] missing session id');
      return;
    }
    const existCourseCodes = new Set(await this.courseService.getAllCourses());

    const response = await this.instance.get('/Default.aspx?page=ctdtkhoisv', {
      headers: { Cookie: checkKey },
    });
    const $ = cheerio.load(response.data);
    const elements = $('[id*="lkDownload"]');
    const courseDtos = elements
      .map((_, element) => {
        const $element = $(element);
        const courseCode = $element
          .closest('td')
          .prev()
          .find('span')
          .text()
          .trim();
        const courseName = $element.text().trim();
        const credits = Number(
          $element.closest('td').next().find('span').text().trim(),
        );

        return plainToInstance(CoursesDto, {
          courseCode,
          name: courseName,
          credits,
          isNew: true,
        });
      })
      .get();

    const createdCourses = await Promise.all(
      courseDtos.map(async (courseDto) => {
        if (existCourseCodes.has(courseDto.courseCode)) {
          this.logger.debug(
            `[SYNC DATA FROM ROAD MAP] Skipping existing course: ${courseDto.courseCode}`,
          );
          return null;
        }

        await this.courseService.createCourse(courseDto);
        this.logger.debug(
          `[SYNC DATA FROM ROAD MAP] Successfully created course: ${courseDto.courseCode}`,
        );
        return courseDto.courseCode;
      }),
    );

    const newCourses = createdCourses.filter((code) => code !== null);

    syncReq.status = true;
    syncReq.failReason = null;
    syncReq.finishTime = new Date();
    await this.createSyncEvent(syncReq);

    this.logger.debug(
      `[SYNC DATA FROM ROAD MAP] Sync completed. New courses created: ${newCourses.length}`,
    );
  }

  async processSyncSchedulerData(studentIdList?: string[]) {
    this.logger.debug('Start to get data for sync scheduler');
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 7);
    const studentIds = await this.userRepo
      .createQueryBuilder('studentUser') // Declare the alias for 'studentUser'
      .innerJoin(
        'studentUser.scheduler', // Use the 'scheduler' relationship from UserEntity
        'template',
        'studentUser.id = template."userId"', // Assuming 'userId' is the foreign key in 'scheduler_template'
      )
      .where('template.is_main_template = :value', { value: true })
      .andWhere(
        '(template.lastsynctime < :date OR template.lastsynctime IS NULL)',
        { date: startTime },
      )
      .getMany();

    this.logger.debug(`Total found ${studentIds.length} studentIds`);

    let filerStudent = studentIds.filter((student) =>
      studentIdList?.includes(student.studentID),
    );
    if (filerStudent.length === 0) {
      filerStudent = studentIds;
    }

    this.logger.debug(`Total filtered out ${filerStudent.length} studentIds`);
    for (const userEntity of filerStudent) {
      const data = {
        studentId: userEntity.studentID,
      };
      this.logger.debug(`Put ${data.studentId} into queue`);
      await this.syncQueue.add(userEntity.studentID, data, {
        removeOnComplete: true,
        removeOnFail: true,
        jobId: userEntity.studentID,
        delay: 0,
      });
    }
  }

  async getJobCount() {
    // const failedJobs = await this.syncQueue.getFailed();
    //
    // for (const job of failedJobs) {
    //   console.log(`Removing failed job ID: ${job.id}`);
    //   await job.remove();
    // }
    return await this.syncQueue.getJobCounts();
  }

  async syncDataFromSchedule(id: string) {
    try {
      const startAt = new Date();
      const checkKey = await this.redisHelper.get(RedisSyncKey);
      this.logger.debug('[SYNC DATA FROM SCHEDULE] Check session key');

      const syncReq: SyncRequestDto = <SyncRequestDto>{
        syncEvent: SYNC_EVENT_FROM_SCHEDULE,
        startTime: startAt,
      };

      if (!checkKey) {
        syncReq.status = false;
        syncReq.failReason = SyncFailReason.MISS_SESSION_ID;
        await this.createSyncEvent(syncReq);
        this.logger.warn('[SYNC DATA FROM SCHEDULE] Missing session key');
        return;
      }

      const courses = await this.courseService.getCourses();
      const courseCodeMap = new Map<string, CoursesEntity>();

      // Populate the courseCodeMap
      courses.forEach((course) => {
        const baseCourseCode = course.courseCode
          .substring(0, 8)
          .trim()
          .toUpperCase();
        courseCodeMap.set(baseCourseCode, course);
      });

      const response = await this.instance.get(
        `/Default.aspx?page=thoikhoabieu&sta=0&id=${id}`,
        {
          headers: { Cookie: checkKey },
        },
      );
      const $ = cheerio.load(response.data);
      const template = await this.schedulerService.getTemplateBySID(id);
      if (!template) {
        syncReq.status = false;
        syncReq.failReason = SyncFailReason.TEMPLATE_NOT_FOUND;
        await this.createSyncEvent(syncReq);
        this.logger.error(
          `[SYNC DATA FROM SCHEDULE] Template not found for ID: ${id}`,
        );
        return;
      }

      $('td[onmouseover^="ddrivetip"]').each(async (_, element) => {
        const onmouseoverAttr = $(element).attr('onmouseover');
        if (!onmouseoverAttr) return;

        const paramsString = onmouseoverAttr.match(/ddrivetip\((.+)\)/)?.[1];
        if (!paramsString) return;

        const params = paramsString
          .split(',')
          .map((param) => param.replace(/'/g, '').trim());

        const courseCodeFull = params[2].toUpperCase().trim();
        const baseCourseCode = courseCodeFull.match(/^([A-Z0-9]+)/)?.[0] ?? '';
        const courseName = $(element).find('span').first().text().trim();
        const credits = parseInt(params[6], 10) || 0;

        let course = courseCodeMap.get(baseCourseCode);

        // Create a new Course if it doesn't exist
        if (!course) {
          const newCourse = new CoursesEntity();
          newCourse.courseCode = baseCourseCode;
          newCourse.name = courseName;
          newCourse.credits = credits;
          newCourse.isNew = true;

          course = await this.courseService.createCourse(newCourse);
          courseCodeMap.set(baseCourseCode, course);

          this.logger.debug(
            `[SYNC DATA FROM SCHEDULE] Created new course: ${JSON.stringify(course)}`,
          );
        }

        // Only proceed if the course exists
        if (course) {
          const coursePosDto = plainToInstance(CoursePositionDto, {
            days: params[3],
            startPeriod: parseInt(params[6], 10) || null,
            periods: parseInt(params[7], 10) || null,
            scheduler: template,
            courses: course,
            isLab: params[5].startsWith('LA'),
          });

          const courseValueDto = plainToInstance(CourseValueDto, {
            lecture: params[8],
            location: params[5],
            numberOfPeriods: parseInt(params[7], 10) || null,
            courses: course,
            scheduler: template,
          });

          // Check and create CoursePosition
          const coursePosExists =
            await this.coursePosService.existsCoursePosition(coursePosDto);
          if (!coursePosExists) {
            await this.coursePosService.createCoursePos(coursePosDto);
            this.logger.debug(
              `[SYNC DATA FROM SCHEDULE] Created course position`,
            );
          }

          // Check and create CourseValue
          const courseValueExists =
            await this.courseValueService.existsCourseValue(courseValueDto);
          if (!courseValueExists) {
            await this.courseValueService.createCourseValue(courseValueDto);
            this.logger.debug(`[SYNC DATA FROM SCHEDULE] Created course value`);
          }
        } else {
          this.logger.warn(
            `[SYNC DATA FROM SCHEDULE] Course mapping failed for code: ${baseCourseCode}`,
          );
        }
      });

      // Update Sync Request
      syncReq.status = true;
      syncReq.finishTime = new Date();
      syncReq.failReason = null;
      await this.createSyncEvent(syncReq);

      this.logger.debug(
        '[SYNC DATA FROM SCHEDULE] Sync completed successfully',
      );
      return response.data;
    } catch (err) {
      this.logger.error(`[SYNC DATA FROM SCHEDULE] Error: ${err.message}`, err);
      throw err;
    }
  }

  async syncRealtime(syncRealtimeReq: SyncRealtimeRequestDto) {
    const event = await this.syncRealtimeRepo.create({
      syncEvent: syncRealtimeReq.syncRealtimeEvent,
      isNew: syncRealtimeReq.isNew,
      referenceId: syncRealtimeReq.referenceId,
    });
    return await this.syncRealtimeRepo.save(event);
  }

  async processingSyncRealtime() {
    const query =
      'SELECT reference_id FROM sync_realtime WHERE is_new = true AND sync_event = $1';
    const UID = await this.dataSource.query(query, [SYNC_EVENT_FROM_SCHEDULE]);
    for (const { reference_id } of UID) {
      console.log(reference_id);
      await this.syncDataFromSchedule(reference_id);
      await this.markSyncAsProcessed(reference_id);
    }
  }

  async markSyncAsProcessed(referenceId: string) {
    await this.syncRealtimeRepo.update(
      { referenceId, isNew: true },
      { isNew: false },
    );
    this.logger.debug('[SYNC REALTIME] Marked sync event as processed');
  }

  async getSyncUser() {
    const syncAdmin = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user_setting_info', 'info', 'user.id=info.user_id')
      .where('info.role =:value', { value: RoleType.SYNC })
      .getOne();
    return syncAdmin;
  }
}
