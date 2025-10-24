import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  ABSTRACT_API,
  EMAIL_VALIDATE_PUBLIC_API,
} from './utils/validation.constant';
import { TracingLoggerService } from '../../logger/tracing-logger.service';
import { EmailValidationHelper } from './service/email-validation.helper';

@Global()
@Module({})
export class ValidationModule {
  static register(config: ValidationConfigs): DynamicModule {
    const { abstractAPIKey, publicEmailValidateAPI, isPublic } = config;
    const providers = [];
    const imports = [];
    if (abstractAPIKey && publicEmailValidateAPI) {
      providers.push(
        {
          provide: ABSTRACT_API,
          useValue: abstractAPIKey,
        },
        {
          provide: EMAIL_VALIDATE_PUBLIC_API,
          useValue: publicEmailValidateAPI,
        },
        TracingLoggerService,
        EmailValidationHelper,
      );
      providers.push();
    }

    return {
      module: ValidationModule,
      imports: imports,
      providers: providers,
      exports: providers,
      global: isPublic ?? false,
    };
  }
}

export class ValidationConfigs {
  abstractAPIKey: string;
  publicEmailValidateAPI: string;
  isPublic?: boolean;
}
