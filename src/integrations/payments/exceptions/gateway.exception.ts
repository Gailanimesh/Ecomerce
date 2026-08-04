import { BadGatewayException, BadRequestException } from '@nestjs/common';

export class PaymentGatewayException extends BadGatewayException {
  constructor(message: string, public readonly details?: any) {
    super({
      statusCode: 502,
      error: 'Bad Gateway',
      message,
      details,
    });
  }
}

export class InvalidSignatureException extends BadRequestException {
  constructor(message: string = 'Payment signature verification failed.') {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message,
    });
  }
}
