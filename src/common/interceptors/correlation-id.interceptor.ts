import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'http') {
      const http = context.switchToHttp();
      const request = http.getRequest<Request>();
      const response = http.getResponse<Response>();

      const existingId = request.headers[CORRELATION_ID_HEADER] as
        | string
        | undefined;
      const correlationId = existingId || randomUUID();

      request.headers[CORRELATION_ID_HEADER] = correlationId;
      (request as Record<string, any>).correlationId = correlationId;

      if (response && typeof response.setHeader === 'function') {
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
      }
    }

    return next.handle();
  }
}
