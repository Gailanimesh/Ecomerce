import { renderEmailLayout } from './base-layout';

export interface PaymentFailedTemplateParams {
  userName: string;
  orderNumber: string;
  amount: string | number;
  reason?: string;
}

export function buildPaymentFailedEmail(params: PaymentFailedTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Payment Failed for Order #${params.orderNumber}`;
  const preheader = `Your payment attempt for Order #${params.orderNumber} could not be completed.`;

  const contentHtml = `
    <span class="badge badge-danger">Payment Incomplete</span>
    <h2 style="margin: 0 0 12px; font-size: 20px;">Payment Attempt Failed</h2>
    <p style="color: #475569; margin: 0 0 20px;">
      Hello <strong>${params.userName}</strong>, we were unable to process your payment for order <strong>#${params.orderNumber}</strong>.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span>Order Number</span>
        <strong>#${params.orderNumber}</strong>
      </div>
      <div class="info-row">
        <span>Amount</span>
        <span>₹${Number(params.amount).toFixed(2)}</span>
      </div>
      ${
        params.reason
          ? `<div class="info-row" style="color: #b91c1c;">
              <span>Reason</span>
              <span>${params.reason}</span>
            </div>`
          : ''
      }
    </div>

    <p style="color: #475569; font-size: 14px;">
      No funds have been permanently deducted. Please visit your account to retry payment using another card or payment method before your reserved order expires.
    </p>
  `;

  const text = `
Payment Failed for Order #${params.orderNumber}
Hello ${params.userName},

We were unable to process your payment of ₹${Number(params.amount).toFixed(2)} for Order #${params.orderNumber}.
${params.reason ? `Reason: ${params.reason}\n` : ''}
Please return to your account to retry payment before the order window closes.
  `.trim();

  return {
    subject,
    html: renderEmailLayout({ title: subject, preheader, contentHtml }),
    text,
  };
}
