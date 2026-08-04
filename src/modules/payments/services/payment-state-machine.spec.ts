import { PaymentStatus } from '../enums/payment.enums';
import {
  VALID_PAYMENT_TRANSITIONS,
  validatePaymentTransition,
} from './payment-state-machine';
import { BadRequestException } from '@nestjs/common';

describe('PaymentStateMachine', () => {
  it('should allow valid transitions', () => {
    expect(() =>
      validatePaymentTransition(PaymentStatus.PENDING, PaymentStatus.COMPLETED),
    ).not.toThrow();

    expect(() =>
      validatePaymentTransition(PaymentStatus.PENDING, PaymentStatus.FAILED),
    ).not.toThrow();

    expect(() =>
      validatePaymentTransition(PaymentStatus.PENDING, PaymentStatus.EXPIRED),
    ).not.toThrow();

    expect(() =>
      validatePaymentTransition(PaymentStatus.COMPLETED, PaymentStatus.REFUNDED),
    ).not.toThrow();
  });

  it('should allow same-status transition (idempotent)', () => {
    expect(() =>
      validatePaymentTransition(PaymentStatus.COMPLETED, PaymentStatus.COMPLETED),
    ).not.toThrow();
  });

  it('should disallow invalid transitions', () => {
    expect(() =>
      validatePaymentTransition(PaymentStatus.FAILED, PaymentStatus.COMPLETED),
    ).toThrow(BadRequestException);

    expect(() =>
      validatePaymentTransition(PaymentStatus.EXPIRED, PaymentStatus.COMPLETED),
    ).toThrow(BadRequestException);

    expect(() =>
      validatePaymentTransition(PaymentStatus.REFUNDED, PaymentStatus.COMPLETED),
    ).toThrow(BadRequestException);
  });
});
