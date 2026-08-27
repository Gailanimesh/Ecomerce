import { renderEmailLayout } from './base-layout';

export interface ReviewApprovedTemplateParams {
  userName: string;
  productName: string;
  rating: number;
}

export function buildReviewApprovedEmail(params: ReviewApprovedTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your review for "${params.productName}" is now published!`;
  const preheader = `Your product review has been approved and published to the store.`;

  const stars = '★'.repeat(params.rating) + '☆'.repeat(5 - params.rating);

  const contentHtml = `
    <span class="badge badge-success">Review Approved</span>
    <h2 style="margin: 0 0 12px; font-size: 20px;">Your Review is Live!</h2>
    <p style="color: #475569; margin: 0 0 20px;">
      Hello <strong>${params.userName}</strong>, thank you for sharing your feedback on <strong>${params.productName}</strong>.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span>Product</span>
        <strong>${params.productName}</strong>
      </div>
      <div class="info-row">
        <span>Your Rating</span>
        <span style="color: #eab308; font-size: 16px;">${stars} (${params.rating}/5)</span>
      </div>
      <div class="info-row">
        <span>Status</span>
        <strong style="color: #16a34a;">Published</strong>
      </div>
    </div>

    <p style="color: #64748b; font-size: 14px;">
      Your honest feedback helps fellow shoppers in our community make informed buying decisions.
    </p>
  `;

  const text = `
Your review for "${params.productName}" is now published!
Hello ${params.userName},

Thank you for reviewing ${params.productName}! Your ${params.rating}-star review has been approved and is now live.

Thank you for contributing to the community!
  `.trim();

  return {
    subject,
    html: renderEmailLayout({ title: subject, preheader, contentHtml }),
    text,
  };
}
