import { renderEmailLayout } from './base-layout';

export interface OrderStatusUpdatedTemplateParams {
  userName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  notes?: string;
}

export function buildOrderStatusUpdatedEmail(params: OrderStatusUpdatedTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const statusFormatted = params.status.replace(/_/g, ' ');
  const subject = `Order #${params.orderNumber} Status Update: ${statusFormatted}`;
  const preheader = `Your order #${params.orderNumber} has been updated to ${statusFormatted}.`;

  const badgeClass =
    params.status === 'DELIVERED' || params.status === 'CONFIRMED'
      ? 'badge-success'
      : params.status === 'CANCELLED'
        ? 'badge-danger'
        : 'badge-info';

  const contentHtml = `
    <span class="badge ${badgeClass}">${statusFormatted}</span>
    <h2 style="margin: 0 0 12px; font-size: 20px;">Order Status Update</h2>
    <p style="color: #475569; margin: 0 0 20px;">
      Hello <strong>${params.userName}</strong>, your order <strong>#${params.orderNumber}</strong> has been updated to <strong>${statusFormatted}</strong>.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span>Order Number</span>
        <strong>#${params.orderNumber}</strong>
      </div>
      <div class="info-row">
        <span>Current Status</span>
        <strong style="text-transform: capitalize;">${statusFormatted.toLowerCase()}</strong>
      </div>
      ${
        params.trackingNumber
          ? `<div class="info-row">
              <span>Tracking Number</span>
              <strong>${params.trackingNumber}</strong>
            </div>`
          : ''
      }
      ${
        params.notes
          ? `<div class="info-row">
              <span>Details</span>
              <span>${params.notes}</span>
            </div>`
          : ''
      }
    </div>

    <p style="color: #64748b; font-size: 14px;">
      You can review complete order details and history anytime in your account.
    </p>
  `;

  const text = `
Order #${params.orderNumber} Status Update: ${statusFormatted}
Hello ${params.userName},

Your order #${params.orderNumber} has been updated to ${statusFormatted}.
${params.trackingNumber ? `Tracking Number: ${params.trackingNumber}\n` : ''}${params.notes ? `Details: ${params.notes}\n` : ''}
Thank you for shopping with us!
  `.trim();

  return {
    subject,
    html: renderEmailLayout({ title: subject, preheader, contentHtml }),
    text,
  };
}
