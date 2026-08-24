# Coupons & Discounts Architecture & Technical Reference

This document details the production-grade **Coupons & Discounts Module** for the NestJS E-Commerce backend.

---

## 1. Architectural Principles

### A. Backend Is the Pricing Authority
- All discount math is performed server-side using the project's integer sub-unit utility (`toPaise`, `toRupees` from `money.util.ts`).
- Frontend-supplied subtotals, discount values, or coupon claims are never trusted.

### B. Preview vs. Validation vs. Consumption Lifecycle

```
[ Customer Cart Preview ]
   POST /api/v1/cart/coupon
   "Can I use this coupon and what would I save right now?"
   -> Calculates preview against live product prices without row locks or usage increments.

[ Checkout Validation ]
   POST /api/v1/orders/checkout { couponCode }
   "Is this coupon still valid?"
   -> Authoritatively validates rules, clamps discount <= subtotal, and creates Order in PENDING_PAYMENT state.
   -> Stores couponCode and discount snapshot on Order.
   -> Does NOT increment usedCount or create CouponUsage yet.

[ Payment Confirmation & Consumption ]
   Payment Webhook / Confirm Payment Hook
   "Payment succeeded; now consume the coupon."
   -> Inside the payment transaction: locks Coupon row (pessimistic_write), increments usedCount += 1, and inserts CouponUsage.
   -> Protected by database UNIQUE constraint ("orderId", "couponId") against duplicate webhooks (Idempotency).
```

---

## 2. Database Schema

### `coupons` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK, DEFAULT uuid_generate_v4()` | Unique identifier |
| `code` | `varchar(50)` | `UNIQUE, NOT NULL` | Normalized uppercase promotion code |
| `description` | `varchar(255)` | `NULLABLE` | Human-readable promotion description |
| `discountType` | `enum` | `'PERCENTAGE', 'FIXED_AMOUNT'` | Calculation strategy |
| `discountValue` | `numeric(10,2)` | `NOT NULL` | Percentage value or fixed currency amount |
| `maxDiscountAmount`| `numeric(10,2)` | `NULLABLE` | Maximum discount cap (for percentage discounts) |
| `minimumOrderAmount`| `numeric(10,2)`| `DEFAULT 0.00` | Minimum order subtotal required to redeem |
| `startsAt` | `timestamp` | `NOT NULL` | Start of promotional validity window |
| `expiresAt` | `timestamp` | `NOT NULL` | Expiry of promotional validity window |
| `usageLimit` | `integer` | `NULLABLE` | Global maximum redemptions across all users |
| `usedCount` | `integer` | `DEFAULT 0` | Total number of successful redemptions |
| `perUserUsageLimit`| `integer` | `DEFAULT 1` | Maximum redemptions per individual customer |
| `isActive` | `boolean` | `DEFAULT true` | Administrative availability switch |
| `createdAt` | `timestamp` | `DEFAULT now()` | Record creation timestamp |
| `updatedAt` | `timestamp` | `DEFAULT now()` | Record update timestamp |

### `coupon_usages` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PK, DEFAULT uuid_generate_v4()` | Unique identifier |
| `couponId` | `uuid` | `FK -> coupons(id), RESTRICT` | Associated coupon |
| `userId` | `uuid` | `FK -> users(id), RESTRICT` | Redeeming customer ID |
| `orderId` | `uuid` | `FK -> orders(id), RESTRICT` | Associated confirmed order ID |
| `discountAmount` | `numeric(10,2)` | `NOT NULL` | Exact discount amount granted |
| `createdAt` | `timestamp` | `DEFAULT now()` | Consumption timestamp |

**Indexes & Constraints**:
- `UNIQUE ("orderId", "couponId")`: Idempotency barrier preventing double redemption from network/webhook retries.
- `INDEX ("couponId", "userId")`: High-speed index for per-user redemption limit checks.
- `INDEX ("orderId")`: Lookup index for order-level discount verification.

---

## 3. Discount Calculation & Clamping Rules

### Percentage Discounts
$$\text{Discount} = \text{round}\left(\text{Subtotal} \times \frac{\text{DiscountValue}}{100}\right)$$
- If `maxDiscountAmount` is specified:
  $$\text{Discount} = \min(\text{Discount}, \text{maxDiscountAmount})$$

### Fixed Amount Discounts
$$\text{Discount} = \text{DiscountValue}$$

### Non-Negative Clamping
$$\text{Discount} = \min(\text{Discount}, \text{Subtotal})$$
$$\text{GrandTotal} = \max(0, \text{Subtotal} - \text{Discount}) + \text{ShippingFee} + \text{Tax}$$

---

## 4. API Endpoints Reference

### Customer Cart Endpoints
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/cart/coupon` | Preview coupon discount on active cart | `CUSTOMER` (Bearer JWT) |
| `DELETE` | `/api/v1/cart/coupon` | Clear coupon preview and return base cart totals | `CUSTOMER` (Bearer JWT) |

### Checkout Integration
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/orders/checkout` | Check out cart with optional `couponCode` | `CUSTOMER` (Bearer JWT) |

### Admin Endpoints
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/coupons` | Create a new coupon promotion | `ADMIN` (Bearer JWT) |
| `GET` | `/api/v1/admin/coupons` | Paginated search & list coupons | `ADMIN` (Bearer JWT) |
| `GET` | `/api/v1/admin/coupons/:id` | Retrieve coupon details by ID | `ADMIN` (Bearer JWT) |
| `PATCH`| `/api/v1/admin/coupons/:id` | Update promotion limits & dates | `ADMIN` (Bearer JWT) |
| `PATCH`| `/api/v1/admin/coupons/:id/activate` | Activate a coupon | `ADMIN` (Bearer JWT) |
| `PATCH`| `/api/v1/admin/coupons/:id/deactivate` | Deactivate a coupon | `ADMIN` (Bearer JWT) |
| `DELETE`| `/api/v1/admin/coupons/:id` | Hard delete coupon (if unused) | `ADMIN` (Bearer JWT) |
| `GET` | `/api/v1/admin/coupons/:id/usage` | Audit history of coupon redemptions | `ADMIN` (Bearer JWT) |

---

## 5. Error Code Reference

| Status Code | Error Scenario |
| :--- | :--- |
| `400 Bad Request` | Coupon is inactive, expired, not yet active, order is below minimum amount, or usage limits are exceeded. |
| `400 Bad Request` | Cannot delete a coupon that has already been consumed in historical orders. |
| `404 Not Found` | Coupon code or ID does not exist. |
| `409 Conflict` | Coupon with code already exists (case-insensitive unique code constraint). |
