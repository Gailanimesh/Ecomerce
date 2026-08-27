import { renderEmailLayout } from './base-layout';

export interface ReviewRejectedTemplateParams {
  userName: string;
  productName: string;
  moderationReason?: string;
}

export function buildReviewRejectedEmail(params: ReviewRejectedTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Update regarding your review for "${params.productName}"`;
  const preheader = `Your product review for ${params.productName} requires revisions before it can be published.`;

  const contentHtml = `
    <span class="badge badge-warning">Review Needs Revision</span>
    <h2 style="margin: 0 0 12px; font-size: 20px;">Review Update</h2>
    <p style="color: #475569; margin: 0 0 20px;">
      Hello <strong>${params.userName}</strong>, our moderation team reviewed your submission for <strong>${params.productName}</strong>.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span>Product</span>
        <strong>${params.productName}</strong>
      </div>
      <div class="info-row">
        <span>Status</span>
        <strong style="color: #d97706;">Not Published</strong>
      </div>
      ${
        params.moderationReason
          ? `<div class="info-row">
              <span>Reason</span>
              <span>${params.moderationReason}</span>
            </div>`
          : ''
      }
    </div>

    <p style="color: #475569; font-size: 14px;">
      You can edit and resubmit your review anytime by visiting the product page in your account.
    </p>
  `;

  const text = `
Update regarding your review for "${params.productName}"
Hello ${params.userName},

Your review for ${params.productName} could not be published at this time.
${params.moderationReason ? `Reason: ${params.moderationReason}\n` : ''}
You can update and resubmit your review anytime through your account.
  `.trim();

  return {
    subject,
    html: renderEmailLayout({ title: subject, preheader, contentHtml }),
    text,
  };
}
