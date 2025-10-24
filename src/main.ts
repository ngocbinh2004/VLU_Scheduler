import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { TracingLoggerMiddleware } from './logger/tracing-logger.middleware';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('/api');
  app.use(compression());
  app.enableCors({
    origin: ['http://localhost:5173', 'https://iu-schedule.vercel.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Nếu cần gửi cookies
  });
  await app.listen(3000);
  const logger = new Logger();
  app.use(TracingLoggerMiddleware);

  logger.log('Server is running in http://localhost:3000.');
}
bootstrap();
