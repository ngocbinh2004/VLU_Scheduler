import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as dotenv from 'dotenv';
import * as process from 'process';
dotenv.config();
export const internalKey = process.env.INTERNAL_KEY;
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requestHeaders = context.switchToHttp().getRequest().headers;
    console.log(internalKey);
    const isApiKey = requestHeaders['adminkey'] === internalKey;
    return isApiKey;
  }
}
