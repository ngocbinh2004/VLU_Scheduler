import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(
    err: any,
    user: any,
    info: Error | JsonWebTokenError | TokenExpiredError,
  ) {
    if (err || !user) {
      if (info instanceof TokenExpiredError) {
        throw new UnauthorizedException('Access token has expired');
      } else if (info instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid access token');
      } else {
        throw new UnauthorizedException('Authentication failed');
      }
    }
    return user;
  }
}
