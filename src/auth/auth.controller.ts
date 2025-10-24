import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDto } from '../modules/user/dto/user.dto';
import { RefreshJwtAuthGuard } from './guard/refresh-jwt-auth.guard';
import { TracingLoggerService } from '../logger/tracing-logger.service';
import { SigninDto } from '../modules/user/dto/signin.dto';
import { LocalAuthGuard } from "./guard/local-auth.guard";

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: TracingLoggerService,
  ) {
    logger.setContext(AuthController.name);
  }

  @Post('register')
  async signup(@Body() userDto: UserDto) {
    try {
      this.logger.debug('receive request register');
      return this.authService.signup(userDto);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Post('login')
  async signIn(@Body() signInDto: SigninDto) {
    try {
      this.logger.debug(`Received login request for email: ${signInDto.email}`);
      return await this.authService.signIn(signInDto);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh')
  async refreshToken(@Request() req) {
    const refreshToken = req.user.refreshToken;
    this.logger.debug(
      `Received refresh token request for user: ${req.user.username}`,
    );
    return this.authService.refreshAccessToken(refreshToken);
  }
}
