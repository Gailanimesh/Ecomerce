import { renderEmailLayout } from './base-layout';

export interface PaymentCompletedTemplateParams {
  userName: string;
  orderNumber: string;
  amount: string | number;
  paymentMethod?: string;
  transactionReference?: string;
}

export function buildPaymentCompletedEmail(params: PaymentCompletedTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Payment Successful for Order #${params.orderNumber}`;
  const preheader = `We received your payment of ₹${Number(params.amount).toFixed(2)} for Order #${params.orderNumber}.`;

  const contentHtml = `
    <span class="badge badge-success">Payment Confirmed</span>
    <h2 style="margin: 0 0 12px; font-size: 20px;">Payment Received!</h2>
    <p style="color: #475569; margin: 0 0 20px;">
      Hello <strong>${params.userName}</strong>, we have successfully received and verified your payment.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span>Order Number</span>
        <strong>#${params.orderNumber}</strong>
      </div>
      <div class="info-row">
        <span>Amount Paid</span>
        <strong>₹${Number(params.amount).toFixed(2)}</strong>
      </div>
      ${
        params.paymentMethod
          ? `<div class="info-row">
              <span>Payment Method</span>
              <span>${params.paymentMethod}</span>
            </div>`
          : ''
      }
      ${
        params.transactionReference
          ? `<div class="info-row">
              <span>Transaction Ref</span>
              <span>${params.transactionReference}</span>
            </div>`
          : ''
      }
    </div>

    <p style="color: #64748b; font-size: 14px;">
      Your order is now being processed for shipping. Thank you for your business!
    </p>
  `;

  const text = `
Payment Successful for Order #${params.orderNumber}
Hello ${params.userName},

We have received your payment of ₹${Number(params.amount).toFixed(2)} for Order #${params.orderNumber}.
${params.transactionReference ? `Transaction Ref: ${params.transactionReference}\n` : ''}
Your order is now confirmed and being processed for shipment.
  `.trim();

  return {
    subject,
    html: renderEmailLayout({ title: subject, preheader, contentHtml }),
    text,
  };
}
