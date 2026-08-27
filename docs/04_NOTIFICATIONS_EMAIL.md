# Notifications & Email Infrastructure Architecture & Technical Reference

This document details the production-grade **Notifications & Email Infrastructure Module** for the NestJS E-Commerce backend.

---

## 1. Architectural Principles

### A. Domain Decoupling & One-Way Dependency
- Business modules (`OrdersModule`, `PaymentsModule`, `ReviewsModule`) declare that domain events occurred without coupling themselves to email transports, SMTP/API clients, or HTML rendering.
- `NotificationsModule` does **not** import or depend on `OrdersModule`, `PaymentsModule`, or `ReviewsModule`. Dependency flow is strictly one-way:

```
OrdersModule ───────┐
                    │
PaymentsModule ─────┼──> NotificationsModule
                    │            │
ReviewsModule ──────┘            └──> EmailIntegrationModule
```

### B. Transactional In-App Notifications vs. Best-Effort Post-Commit Email Dispatch

```
Business Action (e.g. Payment Webhook / Order Checkout)
       │
       ▼
Database Transaction (via externalManager)
       ├── Update Payment / Order State
       ├── Commit Inventory / Coupon Usage
       └── Insert In-App Notification (participates in DB transaction)
       │
       ▼
   COMMIT
       │
       ▼
Post-Commit Email Dispatch (outside DB transaction)
       ├── Mock Provider (Development/Test) -> Logs structured record & memory cache
       └── Resend Provider (Production)     -> HTTPS REST dispatch
       │
       ├── Success: Log [EMAIL_SENT]
       └── Failure: Catch & Log [EMAIL_DISPATCH_FAILED] (Core DB transaction never affected)
```

**Production Invariant**:
- In-app notification creation is **transactional**.
- Email delivery is **best-effort and non-transactional**. Email outages, rate-limits, or network timeouts are safely caught in an error boundary and never cause order or payment rollbacks.

---

## 2. Database Schema & Idempotency

### `notifications` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK, DEFAULT uuid_generate_v4()` | Unique notification ID |
| `userId` | `uuid` | `FK -> users(id), ON DELETE CASCADE` | Recipient user ID |
| `type` | `enum` | `'ORDER_CREATED', 'ORDER_STATUS_UPDATED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED', 'REVIEW_APPROVED', 'REVIEW_REJECTED'` | Domain event classification |
| `title` | `varchar(150)` | `NOT NULL` | Short notification title |
| `message` | `text` | `NOT NULL` | Notification body content |
| `metadata` | `jsonb` | `NULLABLE` | Frontend-neutral navigation context |
| `isRead` | `boolean` | `DEFAULT false` | Read status |
| `readAt` | `timestamp` | `NULLABLE` | Timestamp when marked as read |
| `deduplicationKey` | `varchar(150)` | `NOT NULL` | Deterministic deduplication key |
| `createdAt` | `timestamp` | `DEFAULT now()` | Record creation timestamp |
| `updatedAt` | `timestamp` | `DEFAULT now()` | Record update timestamp |

**Indexes & Constraints**:
- `UNIQUE ("userId", "deduplicationKey")`: Guarantees idempotency on webhook retries or concurrent status updates.
- `INDEX ("userId", "isRead")`: High-speed index for unread count badge indicators.
- `INDEX ("userId", "createdAt")`: High-speed index for customer timeline pagination.

### Deterministic Deduplication Keys Format
- `order-created:{orderId}`
- `order-status:{orderId}:{newStatus}`
- `payment-completed:{paymentId}`
- `payment-failed:{paymentId}`
- `payment-refunded:{paymentId}`
- `review-approved:{reviewId}`
- `review-rejected:{reviewId}`

---

## 3. Email Provider Abstraction

### Interface (`IEmailProvider`)
```typescript
export interface IEmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}
```

### Supported Providers
1. **`MockEmailProvider`** (`EMAIL_PROVIDER=mock`):
   - Default for local development and automated testing.
   - Logs structured event: `[EMAIL_SENT] provider=mock to=... subject=... messageId=...`
   - Exposes internal inspection methods for tests: `getSentEmails()`, `getSentEmailsByRecipient(to)`, `clearSentEmails()`.
2. **`ResendEmailProvider`** (`EMAIL_PROVIDER=resend`):
   - Production HTTPS REST integration (`https://api.resend.com/emails`).
   - Requires `EMAIL_API_KEY` and `EMAIL_FROM` environment variables (validated at startup).

---

## 4. Email Templates Inventory

All email templates are pure functions in `src/modules/notifications/templates/` that return `{ subject, html, text }` wrapped in a clean, modern HTML layout:

| Template | Event | Content Summary |
| :--- | :--- | :--- |
| `order-created.template.ts` | `ORDER_CREATED` | Order confirmation, item count, subtotal, discount, grand total in ₹. |
| `order-status-updated.template.ts` | `ORDER_STATUS_UPDATED` | Fulfillment updates (`CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`). |
| `payment-completed.template.ts` | `PAYMENT_COMPLETED` | Verified payment receipt, order number, amount paid, safe transaction ref. |
| `payment-failed.template.ts` | `PAYMENT_FAILED` | Failure notice, order number, and guidance to retry payment before expiry. |
| `refund.template.ts` | `PAYMENT_REFUNDED` | Refund notice, refund amount in ₹, order number, processing timeline. |
| `review-approved.template.ts` | `REVIEW_APPROVED` | Notice of review publication and star rating. |
| `review-rejected.template.ts` | `REVIEW_REJECTED` | Notice of moderation feedback and guideline revision link. |

---

## 5. REST API Endpoints

All endpoints require JWT Customer Authentication (`Bearer <token>`):

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/notifications` | Paginated notifications list with optional `?unreadOnly=true`, `?page=1`, `?limit=20`. |
| `GET` | `/api/v1/notifications/unread-count` | Returns `{ "count": number }` for navbar notification bell. |
| `PATCH` | `/api/v1/notifications/:id/read` | Marks a specific notification as read. Enforces user ownership (`404` if not found/owned). |
| `PATCH` | `/api/v1/notifications/read-all` | Marks all unread notifications of the user as read. Returns `{ "updatedCount": number }`. |
| `DELETE`| `/api/v1/notifications/:id` | Permanently deletes a notification. Enforces user ownership (`204 No Content`). |

---

## 6. Retention Policy

- In-app notifications are retained indefinitely for this version.
- Future versions may introduce a recurring cron task to archive or purge notifications older than 180 days.
