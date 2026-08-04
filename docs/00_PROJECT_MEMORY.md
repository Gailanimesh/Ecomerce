# PROJECT MEMORY (READ THIS FIRST)

You are continuing development of an existing **production-style NestJS E-commerce Backend**.

This project is NOT starting from scratch.

Before making any changes, understand the existing architecture and integrate with it.

Do NOT redesign completed modules.

Do NOT introduce alternative architectures.

Always extend the existing implementation.

---

# Technology Stack

Framework
- NestJS

Language
- TypeScript

Database
- PostgreSQL

ORM
- TypeORM

Authentication
- Passport JWT
- JWT Access Tokens
- Refresh Tokens
- Session Management

Validation
- class-validator
- ValidationPipe

Caching
- Redis (Future)

Documentation
- Scalar API Reference
- OpenAPI / Swagger decorators

Development
- Docker
- Docker Compose

Database Strategy
- Migration Driven
- synchronize: false

---

# Development Philosophy

The project follows these principles:

- MVP First
- Production Ready
- Clean Architecture
- SOLID Principles
- Thin Controllers
- Business Logic inside Services
- Repositories are responsible only for persistence
- Database transactions where required
- Refactor only when necessary
- Avoid overengineering
- Build features incrementally

Always integrate with the current architecture.

---

# Coding Standards

Always follow the existing coding style.

Controllers

- Thin
- Validation only
- Delegate everything to Services

Services

- Business Logic
- Transactions
- Validation
- Coordination between modules

Repositories

- Persistence only

DTOs

- Organized into folders
- Request DTOs
- Response DTOs
- Query DTOs

Every DTO

- Uses class-validator
- Uses @ApiProperty()
- Has meaningful examples

Documentation

Every endpoint must include

@ApiTags

@ApiOperation

@ApiBearerAuth (where required)

@ApiBody

@ApiQuery

@ApiParam

@ApiCreatedResponse

@ApiOkResponse

@ApiBadRequestResponse

@ApiUnauthorizedResponse

@ApiForbiddenResponse

@ApiConflictResponse

@ApiNotFoundResponse

@ApiInternalServerErrorResponse

Scalar documentation should accurately represent every endpoint.

---

# Things That MUST NOT Be Introduced

Do NOT introduce

- CQRS
- Microservices
- Event Sourcing
- Kafka
- RabbitMQ
- Generic Repository Pattern
- synchronize: true
- Duplicate business logic
- Massive utility classes
- Unnecessary abstractions

Do NOT redesign existing modules.

Only extend them.

---

# Completed Modules

## Database

Completed.

Entities

- Users
- Roles
- Addresses
- Sessions
- Categories
- Brands
- Products
- ProductVariants
- ProductMedia
- Inventory
- Cart
- CartItems
- Orders
- OrderItems
- OrderHistory
- Payments (entity already exists)

All migrations are working correctly.

Database schema is stable.

---

## Authentication

Completed.

Features

- Register
- Login
- Refresh Token Rotation
- JWT Authentication
- Passport JWT Strategy
- RBAC
- RolesGuard
- JwtAuthGuard
- Logout
- Logout All
- Session Management
- HttpOnly Refresh Cookies
- Multi Device Login

Architecture

- Stateless Access Tokens
- Refresh Tokens stored hashed
- Sessions stored in database
- Role included in AuthenticatedUser
- SessionId included in JWT payload

---

## Catalog

Completed.

Modules

Categories

Brands

Products

ProductVariants

ProductMedia

Business Rules

- ProductMedia belongs to Product
- Product must contain at least one Variant
- Price belongs to ProductVariant
- Inventory points to ProductVariant
- Product status lifecycle implemented
- Slug generation service
- Product creation uses transactions

Features

- Pagination
- Search
- Filtering
- Sorting
- RBAC
- Complete API Documentation

---

## Inventory

Completed.

Business Rules

Inventory owns stock.

Orders never modify stock directly.

Inventory exposes

- reserveStock()
- commitReservation()
- releaseReservation()

Inventory uses pessimistic row locking.

Overselling protection implemented.

---

## Cart

Completed.

Features

- Add Item
- Remove Item
- Update Quantity
- Inventory Validation
- User Active Cart

Business Rules

Cart never owns prices.

Prices always come from ProductVariant.

---

## Orders

Completed.

Business Rules

Orders orchestrate.

Orders do NOT own

- Inventory
- Catalog
- Payments

Orders are immutable business records.

Orders store snapshots.

Snapshots include

- Product Name
- Product Slug
- Variant Name
- Variant Attributes
- SKU
- Brand
- Category
- Thumbnail
- Unit Price
- Quantity

Address Snapshot

- Recipient Name
- Phone
- Address Lines
- City
- State
- Country
- Postal Code

Features

- Transactional Checkout
- Backend Price Calculation
- Pessimistic Inventory Reservation
- Order History
- Customer Order APIs
- Admin Order APIs
- Search
- Pagination
- Filtering
- Order Number Generation

Order Number Format

ORD-YYYYMMDD-XXXXXX

Order History

Tracks

- Status
- Changed By
- Role
- Reason
- Notes

Status Machine implemented.

VALID_TRANSITIONS already exists.

Payment Integration Hooks already prepared.

Methods already exist

- createPendingPayment()
- confirmPayment()
- failPayment()
- refundPayment()
- expirePendingPayment()

Do NOT redesign Orders.

Integrate with it.

---

# Existing Architecture Decisions

These decisions are FINAL.

Do NOT change them.

Authentication

- JWT
- Refresh Tokens
- Sessions

Catalog

- ProductMedia belongs to Product
- ProductVariant owns price
- SlugService generates unique slugs

Inventory

- Inventory owns stock
- Reservation system
- Pessimistic locking

Cart

- No prices stored as source of truth

Orders

- Snapshot based
- Transactional checkout
- Inventory reservation
- Order History
- Payment hooks prepared

Payments

- Payment entity is the single source of truth for payment lifecycle
- Order stores paymentMethod only
- Order never stores paymentStatus

General

- Thin Controllers
- Business Logic in Services
- Repository only persists
- DTOs separated
- Scalar documentation complete

---

# Learning Mode

This project is also a learning project.

When implementing

- Keep code readable
- Keep methods small
- Use meaningful naming
- Separate responsibilities
- Prefer explicit code over clever code
- Avoid hiding important business logic

When introducing advanced concepts

(HMAC verification, Webhooks, Idempotency, Gateway abstraction, etc.)

implement them cleanly so they are easy to study afterward.

The code should teach as well as work.

---

# Current Objective

Implement the **Payments Module**.

The Orders module has already been completed.

The Payment entity already exists.

Do NOT redesign Orders.

Do NOT redesign Inventory.

Do NOT redesign Authentication.

Extend the existing architecture.

Prepare a production-quality payment workflow using Razorpay Test Mode while keeping the gateway implementation abstract enough that Stripe or another provider can be added later.

Study the existing codebase first, understand how Orders integrates with Payments, and then implement the new functionality following the established architecture, coding standards, documentation style, testing strategy, and module boundaries.