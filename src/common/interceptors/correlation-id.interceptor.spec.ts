import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import {
  CorrelationIdInterceptor,
  CORRELATION_ID_HEADER,
} from './correlation-id.interceptor';

describe('CorrelationIdInterceptor', () => {
  let interceptor: CorrelationIdInterceptor;

  beforeEach(() => {
    interceptor = new CorrelationIdInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should generate a new correlation ID if none is present in request headers', (done) => {
    const mockRequest: any = { headers: {} };
    const mockResponse: any = { setHeader: jest.fn() };
    const mockContext: Partial<ExecutionContext> = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };
    const mockCallHandler: CallHandler = {
      handle: () => of('test-response'),
    };

    interceptor
      .intercept(mockContext as ExecutionContext, mockCallHandler)
      .subscribe({
        next: (res) => {
          expect(res).toBe('test-response');
          const generatedId = mockRequest.headers[CORRELATION_ID_HEADER];
          expect(generatedId).toBeDefined();
          expect(typeof generatedId).toBe('string');
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            CORRELATION_ID_HEADER,
            generatedId,
          );
          done();
        },
      });
  });

  it('should reuse existing correlation ID from request headers', (done) => {
    const existingId = 'custom-correlation-123';
    const mockRequest: any = {
      headers: { [CORRELATION_ID_HEADER]: existingId },
    };
    const mockResponse: any = { setHeader: jest.fn() };
    const mockContext: Partial<ExecutionContext> = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };
    const mockCallHandler: CallHandler = {
      handle: () => of('test-response'),
    };

    interceptor
      .intercept(mockContext as ExecutionContext, mockCallHandler)
      .subscribe({
        next: () => {
          expect(mockRequest.headers[CORRELATION_ID_HEADER]).toBe(existingId);
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            CORRELATION_ID_HEADER,
            existingId,
          );
          done();
        },
      });
  });
});
