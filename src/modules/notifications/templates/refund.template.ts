import { renderEmailLayout } from './base-layout';

export interface RefundProcessedTemplateParams {
  userName: string;
  orderNumber: string;
  refundAmount: string | number;
  reason?: string;
}

export function buildRefundProcessedEmail(params: RefundProcessedTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Refund Processed for Order #${params.orderNumber}`;
  const preheader = `A refund of ₹${Number(params.refundAmount).toFixed(2)} has been issued for Order #${params.orderNumber}.`;

  const contentHtml = `
    <span class="badge badge-info">Refund Processed</span>
    <h2 style="margin: 0 0 12px; font-size: 20px;">Refund Notice</h2>
    <p style="color: #475569; margin: 0 0 20px;">
      Hello <strong>${params.userName}</strong>, a refund has been issued for your order <strong>#${params.orderNumber}</strong>.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span>Order Number</span>
        <strong>#${params.orderNumber}</strong>
      </div>
      <div class="info-row">
        <span>Refund Amount</span>
        <strong style="color: #16a34a;">₹${Number(params.refundAmount).toFixed(2)}</strong>
      </div>
      ${
        params.reason
          ? `<div class="info-row">
              <span>Reason</span>
              <span>${params.reason}</span>
            </div>`
          : ''
      }
    </div>

    <p style="color: #64748b; font-size: 14px;">
      The refunded amount typically reflects in your original payment method within 5-7 business days depending on your bank.
    </p>
  `;

  const text = `
Refund Processed for Order #${params.orderNumber}
Hello ${params.userName},

A refund of ₹${Number(params.refundAmount).toFixed(2)} has been issued for Order #${params.orderNumber}.
${params.reason ? `Reason: ${params.reason}\n` : ''}
The amount will reflect in your account within 5-7 business days.
  `.trim();

  return {
    subject,
    html: renderEmailLayout({ title: subject, preheader, contentHtml }),
    text,
  };
}
