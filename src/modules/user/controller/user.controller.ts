import { TracingLoggerService } from '../../../logger/tracing-logger.service';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserService } from '../service/user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: TracingLoggerService,
  ) {
    this.logger.setContext(UserController.name);
  }

  @Get('')
  async findUserViaEmail(@Query('email') email: string) {
    try {
      this.logger.debug(`[FIND USER]-Find user via email ${email}`);
      return await this.userService.findAccountWithEmail(email);
    } catch (e) {
      this.logger.error('Error finding user via email');
      throw e;
    }
  }

  @Get(':id')
  userInfor(@Param('id') id: number) {
    return this.userService.getUserInfor(id);
  }
}
