import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '../enums/payment.enums';

/**
 * Valid state machine transitions matrix for Payment entity lifecycle.
 */
export const VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [
    PaymentStatus.COMPLETED,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.COMPLETED]: [PaymentStatus.REFUNDED],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.EXPIRED]: [],
  [PaymentStatus.CANCELLED]: [],
  [PaymentStatus.REFUNDED]: [],
};

/**
 * Validates transition from current status to target status.
 * Throws BadRequestException if transition is invalid according to state machine matrix.
 */
export function validatePaymentTransition(
  currentStatus: PaymentStatus,
  targetStatus: PaymentStatus,
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  const allowedTransitions = VALID_PAYMENT_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(targetStatus)) {
    throw new BadRequestException(
      `Cannot transition payment status from "${currentStatus}" to "${targetStatus}".`,
    );
  }
}
