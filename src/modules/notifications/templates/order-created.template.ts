import { renderEmailLayout } from './base-layout';

export interface OrderCreatedTemplateParams {
  userName: string;
  orderNumber: string;
  subtotal: string | number;
  discount: string | number;
  shippingFee: string | number;
  grandTotal: string | number;
  itemCount: number;
}

export function buildOrderCreatedEmail(params: OrderCreatedTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Order Confirmation #${params.orderNumber}`;
  const preheader = `Thank you for your order #${params.orderNumber}. We've received it and are processing it.`;

  const contentHtml = `
    <span class="badge badge-info">Order Received</span>
    <h2 style="margin: 0 0 12px; font-size: 20px;">Thank You for Your Order, ${params.userName}!</h2>
    <p style="color: #475569; margin: 0 0 20px;">
      We're excited to let you know that your order <strong>#${params.orderNumber}</strong> has been successfully placed.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span>Order Number</span>
        <strong>#${params.orderNumber}</strong>
      </div>
      <div class="info-row">
        <span>Items</span>
        <span>${params.itemCount} item(s)</span>
      </div>
      <div class="info-row">
        <span>Subtotal</span>
        <span>₹${Number(params.subtotal).toFixed(2)}</span>
      </div>
      ${
        Number(params.discount) > 0
          ? `<div class="info-row" style="color: #16a34a;">
              <span>Discount</span>
              <span>-₹${Number(params.discount).toFixed(2)}</span>
            </div>`
          : ''
      }
      <div class="info-row">
        <span>Shipping</span>
        <span>₹${Number(params.shippingFee).toFixed(2)}</span>
      </div>
      <div class="info-row">
        <span>Grand Total</span>
        <span>₹${Number(params.grandTotal).toFixed(2)}</span>
      </div>
    </div>

    <p style="color: #64748b; font-size: 14px;">
      You will receive another update once your payment is confirmed and your items are dispatched.
    </p>
  `;

  const text = `
Order Confirmation #${params.orderNumber}
Hello ${params.userName},

Thank you for your order! Your order #${params.orderNumber} with ${params.itemCount} item(s) has been placed successfully.

Subtotal: ₹${Number(params.subtotal).toFixed(2)}
Discount: ₹${Number(params.discount).toFixed(2)}
Grand Total: ₹${Number(params.grandTotal).toFixed(2)}

You can track your order status in your account dashboard.
  `.trim();

  return {
    subject,
    html: renderEmailLayout({ title: subject, preheader, contentHtml }),
    text,
  };
}
