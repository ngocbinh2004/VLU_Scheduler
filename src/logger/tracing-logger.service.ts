import { Injectable, Logger, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable({ scope: Scope.TRANSIENT })
export class TracingLoggerService extends Logger {
  constructor(private readonly als: AsyncLocalStorage<any>) {
    super();
  }

  setContext(context?: string) {
    this.context = context;
  }

  private getMessage(message: string) {
    const tracingId = this.als?.getStore()?.tracingId;
    if (tracingId) {
      return `${tracingId} - ${message}`;
    }
    return `${message}`;
  }
  // general information: request coming, request solving (status of the request)
  verbose(message: any): void {
    super.verbose(this.getMessage(message));
  }
  // debug value: debug information like after query log how many entities retrieve
  debug(message: any) {
    super.debug(this.getMessage(message));
  }
  // warning information: log info about the missing value affect to the result
  warn(message: any, context?: string) {
    super.warn(this.getMessage(message), context);
  }
  // error information: log error when throw information
  error(message: any, stack?: string, context?: string) {
    super.error(this.getMessage(message), stack, context);
  }
  // log info: log information related to the response status
  log(message: any, context?: string) {
    super.log(this.getMessage(message), context);
  }
}
