# WedHub Backend — Production Architecture & Phase-by-Phase Implementation Plan

> **Document purpose:** Complete backend engineering blueprint for WedHub.
>
> **Primary goal:** Build a production-ready wedding discovery marketplace backend that can support users, vendors, admin operations, search, enquiries/leads, reviews, subscriptions, media, notifications, Telegram, SEO/CMS data, analytics, and future expansion without premature microservices.

---

## 1. Product Context

WedHub is an all-in-one wedding discovery and vendor marketplace.

The backend must support:

- End users discovering wedding vendors
- Vendors creating and managing business profiles
- Admins verifying, moderating, featuring, and managing vendors
- Search by category, location, budget, rating, services, and other filters
- Vendor portfolios and media
- Enquiries and lead generation
- Vendor lead management
- Reviews and ratings
- Vendor verification
- Free / Pro / Premium subscriptions
- Featured listings and promotional placement
- Telegram chatbot for MVP
- Future WhatsApp integration
- SEO/CMS content
- Notifications
- Analytics
- Audit logs
- Strong security and abuse prevention
- PostgreSQL as the only primary database

### 1.1 Core business flow

```text
User
  ↓
Discover category/city
  ↓
Search/filter vendors
  ↓
Open vendor profile
  ↓
Trust signals: reviews + verification + portfolio
  ↓
Submit enquiry
  ↓
Lead created
  ↓
Vendor notified
  ↓
Vendor contacts couple
  ↓
Lead progresses
  ↓
Conversion / lost / closed
```

---

# 2. Non-Negotiable Architecture Decisions

## 2.1 Backend style

Use a **modular monolith** initially.

Do NOT start with:

- Microservices
- Kubernetes
- Multiple independent backend repositories
- Event-driven distributed architecture everywhere
- Separate search cluster
- Separate analytics warehouse
- Multiple databases

The codebase must have strong module boundaries so individual modules can later be extracted if scale requires it.

---

## 2.2 Database

Use:

**PostgreSQL only**

PostgreSQL is the source of truth for:

- Users
- Vendors
- Categories
- Locations
- Services
- Packages
- Enquiries
- Leads
- Reviews
- Subscriptions
- Payments
- Notifications
- Conversations
- Messages
- CMS
- Analytics metadata
- Admin operations
- Audit logs

Use PostgreSQL features such as:

- UUIDs
- JSONB
- Full-text search
- `pg_trgm`
- Transactions
- Foreign keys
- Check constraints
- Partial indexes
- Composite indexes
- Row-level locking where needed

Use PostGIS later if geographical/radius search becomes important.

---

## 2.3 Media

Do NOT store images/videos inside PostgreSQL.

Recommended:

```text
Client
  ↓
Backend requests upload authorization
  ↓
Client uploads directly to object storage
  ↓
Object storage
  ↓
CDN
  ↓
Public website
```

Use Cloudflare R2 or equivalent object storage.

Database stores:

- object key
- media type
- MIME type
- size
- width
- height
- duration
- checksum
- owner
- entity relationship
- processing status
- visibility

---

## 2.4 Cache / queue

Redis is optional during the first MVP.

Introduce Redis when needed for:

- Caching
- Rate limiting
- BullMQ queues
- Background jobs
- Temporary OTP/session state
- Distributed locks
- High-volume counters

PostgreSQL remains the source of truth.

---

# 3. Recommended Technology Stack

## Backend

- Node.js
- TypeScript
- Express.js
- REST API
- Zod or equivalent schema validation
- Prisma or Drizzle ORM

## Database

- PostgreSQL

## Queue / cache

- Redis
- BullMQ

## Media

- Cloudflare R2
- Cloudflare CDN

## Authentication

- JWT or secure session architecture
- HttpOnly cookies where appropriate
- Refresh token rotation if JWT architecture is used

## Payments

- Razorpay initially
- Provider abstraction for future Stripe support

## Messaging

MVP:

- Telegram Bot API

Future:

- WhatsApp Business API
- Email provider
- SMS provider

## Infrastructure

- Docker
- Ubuntu 24.04 LTS
- 4 vCPU / 8 GB RAM VPS for early production
- Nginx or Caddy
- Cloudflare
- HTTPS
- Automated backups

---

# 4. Repository Architecture

Recommended backend repository:

```text
wedhub-backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── storage.ts
│   │   └── logger.ts
│   │
│   ├── common/
│   │   ├── constants/
│   │   ├── enums/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── types/
│   │   ├── utils/
│   │   └── validators/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── vendors/
│   │   ├── categories/
│   │   ├── locations/
│   │   ├── services/
│   │   ├── packages/
│   │   ├── media/
│   │   ├── search/
│   │   ├── enquiries/
│   │   ├── leads/
│   │   ├── reviews/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   ├── featured-listings/
│   │   ├── notifications/
│   │   ├── messaging/
│   │   ├── telegram/
│   │   ├── analytics/
│   │   ├── cms/
│   │   ├── reports/
│   │   └── admin/
│   │
│   ├── jobs/
│   │   ├── queues/
│   │   ├── processors/
│   │   └── schedules/
│   │
│   ├── integrations/
│   │   ├── payment/
│   │   ├── storage/
│   │   ├── telegram/
│   │   ├── email/
│   │   └── sms/
│   │
│   └── routes/
│       └── index.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/
├── docs/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
├── eslint.config.js
├── README.md
└── .gitignore
```

---

# 5. Module Internal Structure

Every major module should follow the same pattern.

Example:

```text
modules/vendors/
├── vendor.controller.ts
├── vendor.service.ts
├── vendor.repository.ts
├── vendor.routes.ts
├── vendor.schema.ts
├── vendor.types.ts
├── vendor.mapper.ts
├── vendor.policy.ts
└── index.ts
```

Responsibilities:

### Controller

Handles:

- HTTP request
- Authentication context
- Validation invocation
- Calling service
- HTTP response

Controllers should contain minimal business logic.

### Service

Contains:

- Business rules
- Transactions
- Workflow
- Authorization decisions
- Domain orchestration

### Repository

Contains:

- Database queries
- Prisma/Drizzle operations
- Query composition

Do not put business rules into repositories.

### Schema

Contains:

- Request validation
- Query validation
- Response validation where useful

### Policy

Contains:

- Permission checks
- Ownership rules
- Vendor/admin/user access rules

---

# 6. API Architecture

Base URL:

```text
/api/v1
```

Example:

```text
/api/v1/auth
/api/v1/users
/api/v1/vendors
/api/v1/categories
/api/v1/locations
/api/v1/search
/api/v1/enquiries
/api/v1/leads
/api/v1/reviews
/api/v1/subscriptions
/api/v1/payments
/api/v1/notifications
/api/v1/admin
```

Version APIs from day one.

Do not create:

```text
/api/vendor
```

when the intended architecture is versioned.

Prefer:

```text
/api/v1/vendors
```

---

# 7. API Response Standard

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VENDOR_NOT_FOUND",
    "message": "Vendor not found",
    "details": {}
  }
}
```

Pagination:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

Use consistent machine-readable error codes.

---

# 8. Authentication Architecture

Supported actors:

```text
END_USER
VENDOR
ADMIN
SUPER_ADMIN
```

Recommended authentication flow:

```text
Register/Login
    ↓
Credential verification
    ↓
Session / access token
    ↓
Authorization middleware
    ↓
Role/policy validation
    ↓
Controller
```

Authentication must support:

- Email
- Phone
- Password
- OTP later
- Password reset
- Email verification
- Account lockout/rate limiting
- Session/token revocation
- Logout
- Device/session management later

Never store:

- Plain passwords
- Raw payment secrets
- Raw API secrets
- Unsigned webhook data

---

# 9. Authorization

Use RBAC plus resource ownership policies.

Example:

```text
Admin
  ├── vendor:read
  ├── vendor:create
  ├── vendor:update
  ├── vendor:approve
  ├── vendor:suspend
  └── subscription:manage

Vendor
  ├── profile:read
  ├── profile:update
  ├── leads:read
  ├── leads:update
  └── media:manage

User
  ├── profile:update
  ├── favorites:manage
  ├── shortlist:manage
  └── enquiry:create
```

Never rely only on frontend hiding buttons.

Backend must enforce every permission.

---

# 10. Core Database Design

## 10.1 Users

```text
users
```

Fields:

- id
- email
- phone
- password_hash
- role
- status
- email_verified_at
- phone_verified_at
- last_login_at
- created_at
- updated_at
- deleted_at

---

## 10.2 User profiles

```text
user_profiles
```

Fields:

- user_id
- first_name
- last_name
- avatar_media_id
- city_id
- bio
- preferences
- created_at
- updated_at

---

# 11. Wedding Profile

Optional but valuable for personalization.

```text
wedding_profiles
```

Fields:

- id
- user_id
- wedding_date
- city_id
- venue_city_id
- guest_count
- estimated_budget
- wedding_style
- notes
- created_at
- updated_at

This becomes useful for:

- Recommendations
- Vendor matching
- Personalized dashboard
- Lead context
- Telegram conversations

---

# 12. Vendor Data Model

Core:

```text
vendors
vendor_profiles
vendor_categories
vendor_service_areas
vendor_services
packages
```

Vendor states:

```text
DRAFT
PENDING_VERIFICATION
PENDING_APPROVAL
APPROVED
REJECTED
SUSPENDED
DEACTIVATED
```

Vendor profile fields:

- business name
- slug
- description
- logo
- cover image
- category
- subcategory
- starting price
- pricing model
- city
- service areas
- website
- Instagram
- Facebook
- contact details
- years of experience
- team size
- verification status
- subscription
- rating
- review count
- enquiry count
- SEO metadata

---

# 13. Category System

Categories should be database-driven.

Example:

```text
Photography
Videography
Venues
Makeup Artists
Mehndi Artists
Wedding Planners
Decorators
Caterers
DJs
Choreographers
Bridal Wear
Groom Wear
Jewellery
Invitations
Cakes
Florists
Rentals
Transportation
Honeymoon & Travel
Destination Weddings
```

Subcategories must also be database-driven.

Do not hardcode categories throughout the backend.

---

# 14. Dynamic Category Attributes

Use:

```text
category_attributes
```

Example photography attributes:

```json
{
  "drone": true,
  "pre_wedding": true,
  "cinematic_video": true,
  "live_streaming": true
}
```

Venue attributes:

```json
{
  "parking": true,
  "rooms": 35,
  "capacity": 500,
  "outdoor_area": true,
  "accommodation": true
}
```

Store flexible attributes using PostgreSQL JSONB.

Do not create dozens of tables for every possible vendor-specific field.

---

# 15. Media Architecture

Tables:

```text
media
albums
album_items
```

Media lifecycle:

```text
REQUEST_UPLOAD
    ↓
SIGNED_UPLOAD
    ↓
UPLOADING
    ↓
UPLOADED
    ↓
PROCESSING
    ↓
READY
```

Statuses:

```text
PENDING
UPLOADING
PROCESSING
READY
FAILED
DELETED
```

Store metadata:

- object key
- original filename
- MIME type
- size
- width
- height
- duration
- checksum
- storage provider
- CDN URL
- owner
- visibility

---

# 16. Image Processing

For vendor images generate:

```text
original
large
medium
thumbnail
```

Recommended formats:

```text
WebP
AVIF
```

Use background processing for:

- resizing
- compression
- metadata extraction
- thumbnail generation
- video processing later

Never make a normal HTTP request wait for expensive media processing.

---

# 17. Search Architecture

MVP search should use PostgreSQL.

Support:

- Keyword
- Category
- Subcategory
- City
- Service area
- Price
- Rating
- Verified
- Services
- Features
- Availability where supported
- Subscription visibility
- Featured status

Sort options:

```text
RELEVANCE
RATING
POPULARITY
PRICE_LOW
PRICE_HIGH
NEWEST
RECOMMENDED
```

Use:

- PostgreSQL indexes
- Full-text search
- `pg_trgm`
- Composite indexes

Later abstraction:

```text
SearchService
   ↓
PostgresSearchProvider
```

Can later become:

```text
OpenSearchProvider
```

without rewriting controllers.

---

# 18. Vendor Ranking

Do not simply sort by subscription forever.

Create a ranking service.

Possible ranking factors:

```text
relevance
+
location match
+
category match
+
profile completeness
+
rating
+
review count
+
response rate
+
lead conversion
+
verification
+
featured placement
```

Paid plans can receive visibility benefits, but rankings should preserve user trust.

---

# 19. Enquiry Architecture

An enquiry is the user's initial request.

Fields:

- id
- user_id
- vendor_id
- category_id
- wedding_date
- city_id
- budget
- guest_count
- contact_name
- contact_email
- contact_phone
- message
- source
- status
- created_at

Sources:

```text
WEB
TELEGRAM
ADMIN
FUTURE_WHATSAPP
```

---

# 20. Lead Architecture

Lead is the vendor-facing business lifecycle record.

Statuses:

```text
NEW
CONTACTED
RESPONDED
QUALIFIED
MEETING
QUOTED
WON
LOST
SPAM
CLOSED
```

Lead lifecycle:

```text
Enquiry
  ↓
Lead
  ↓
Vendor response
  ↓
Contact
  ↓
Qualification
  ↓
Meeting / Quote
  ↓
Won / Lost
```

Track:

- status history
- timestamps
- source
- vendor
- user
- enquiry
- assigned admin
- notes
- loss reason

---

# 21. Lead Deduplication

Prevent repeated spam leads.

Potential dedupe keys:

```text
same user + same vendor + recent enquiry
same phone + same vendor + recent enquiry
same email + same vendor + recent enquiry
```

Create configurable deduplication windows.

Example:

```text
Do not create duplicate lead for same phone/vendor
within 24 hours unless explicitly allowed.
```

---

# 22. Lead Notifications

When a new lead is created:

```text
Lead created
    ↓
Transaction commits
    ↓
Queue notification job
    ↓
Vendor notification
    ↓
Email / Telegram / future WhatsApp
```

Do not send external notifications before the database transaction safely commits.

---

# 23. Reviews

Review fields:

- user_id
- vendor_id
- rating
- title
- content
- service
- event date
- verified interaction
- status
- vendor response
- created_at

Review states:

```text
PENDING
APPROVED
REJECTED
FLAGGED
HIDDEN
```

Admin moderation required.

---

# 24. Vendor Verification

Verification workflow:

```text
Vendor submits documents/details
        ↓
Admin review
        ↓
APPROVED / REJECTED
```

Possible verification levels:

```text
UNVERIFIED
BASIC_VERIFIED
IDENTITY_VERIFIED
BUSINESS_VERIFIED
```

Keep the exact criteria configurable.

---

# 25. Subscription Architecture

Plans:

```text
FREE
PRO
PREMIUM
```

Initial example pricing:

```text
FREE     ₹0/month
PRO      ₹5,999/month
PREMIUM  ₹12,999/month
```

These prices must NOT be hardcoded.

Store them in:

```text
subscription_plans
```

---

# 26. Subscription Entitlements

Never implement:

```text
if plan === "PREMIUM"
```

throughout the codebase.

Instead:

```text
subscription
    ↓
entitlements
    ↓
feature check
```

Example entitlements:

```text
profile_visibility
portfolio_limit
video_limit
lead_access
analytics_level
featured_eligibility
promotional_placement
response_tools
priority_support
```

This makes plans configurable.

---

# 27. Subscription Lifecycle

Statuses:

```text
TRIALING
ACTIVE
PAST_DUE
PAUSED
CANCELLED
EXPIRED
```

Flow:

```text
Plan selected
  ↓
Checkout
  ↓
Payment provider
  ↓
Webhook
  ↓
Webhook verification
  ↓
Idempotency check
  ↓
Subscription transaction
  ↓
Entitlements updated
```

---

# 28. Payment Architecture

Create provider abstraction:

```text
PaymentProvider
├── createCheckout()
├── verifyPayment()
├── refund()
├── getPayment()
└── verifyWebhook()
```

Implement:

```text
RazorpayProvider
```

Later:

```text
StripeProvider
```

Never let Razorpay-specific code leak through every business module.

---

# 29. Webhook Security

For every payment webhook:

1. Receive request
2. Verify signature
3. Validate event
4. Check idempotency
5. Start transaction
6. Update payment
7. Update subscription
8. Store webhook event
9. Commit
10. Return success

Store:

```text
payment_webhook_events
```

with unique external event ID.

---

# 30. Featured Listings

Featured placement is separate from subscription.

Table:

```text
featured_listings
```

Fields:

- vendor_id
- placement
- city_id
- category_id
- start_at
- end_at
- priority
- status
- payment_id
- created_by

Potential placements:

```text
homepage
category_page
city_page
search_results
campaign_page
```

---

# 31. Notifications

Notification entity:

```text
notifications
```

Channels:

```text
IN_APP
EMAIL
TELEGRAM
SMS
WHATSAPP
```

Types:

```text
NEW_LEAD
LEAD_UPDATE
REVIEW_RECEIVED
REVIEW_APPROVED
SUBSCRIPTION_EXPIRING
PAYMENT_SUCCESS
PAYMENT_FAILED
VENDOR_APPROVED
VENDOR_REJECTED
SYSTEM
```

Use a notification service abstraction.

---

# 32. Messaging Architecture

Do not tightly couple the core system to Telegram.

Create:

```text
MessagingProvider
```

Methods:

```text
sendMessage()
sendMedia()
receiveMessage()
createConversation()
closeConversation()
```

Implement:

```text
TelegramProvider
```

Future:

```text
WhatsAppProvider
```

---

# 33. Telegram Architecture

Telegram should be deterministic for MVP.

Conversation state:

```text
START
SELECTING_CATEGORY
SELECTING_LOCATION
COLLECTING_DATE
COLLECTING_BUDGET
COLLECTING_GUEST_COUNT
COLLECTING_CONTACT
MATCHING_VENDORS
SELECTING_VENDOR
CONFIRMING_ENQUIRY
COMPLETED
```

Store:

```text
telegram_users
conversations
messages
conversation_state
external_message_id
```

Never rely only on in-memory state.

---

# 34. Telegram Flow

Example:

```text
User: I need a photographer

Bot:
Which city?

User:
Toronto

Bot:
When is the wedding?

User:
June 20

Bot:
Approximate budget?

User:
$3000

Bot:
Here are matching photographers.

User:
Vendor 2

Bot:
Should I send your enquiry?

User:
Yes

Backend:
Create enquiry
Create lead
Notify vendor
```

---

# 35. Idempotency

Idempotency is mandatory for:

- Payment webhooks
- Telegram webhook events
- Lead creation where external retries are possible
- Notification jobs
- Media processing callbacks
- Any external provider callback

Use unique external IDs.

Example:

```text
telegram_update_id UNIQUE
payment_provider_event_id UNIQUE
```

---

# 36. Background Jobs

Use BullMQ once Redis is introduced.

Queues:

```text
media-processing
notifications
emails
telegram
payments
analytics
search-index
cleanup
```

Example:

```text
POST /media/upload
   ↓
DB media record
   ↓
Queue media-processing
   ↓
Worker
   ↓
Generate variants
   ↓
Update media status
```

---

# 37. Analytics

MVP analytics can remain PostgreSQL-backed.

Events:

```text
PAGE_VIEW
VENDOR_VIEW
SEARCH
FILTER_APPLIED
FAVORITE_ADDED
SHORTLIST_CREATED
ENQUIRY_STARTED
ENQUIRY_SUBMITTED
LEAD_CREATED
LEAD_CONTACTED
LEAD_WON
SUBSCRIPTION_STARTED
SUBSCRIPTION_CANCELLED
```

Store:

```text
analytics_events
```

Fields:

- event_name
- actor_type
- actor_id
- vendor_id
- session_id
- source
- metadata JSONB
- created_at

Avoid building a separate warehouse initially.

---

# 38. Admin Architecture

Admin should have backend APIs for:

### Users

- list
- search
- view
- suspend
- restore
- delete/anonymize

### Vendors

- list
- approve
- reject
- verify
- suspend
- edit
- feature

### Categories

- create
- update
- reorder
- activate/deactivate
- manage attributes

### Locations

- country
- state/province
- city
- neighborhoods
- service areas

### Leads

- view
- assign
- inspect
- mark spam
- close

### Reviews

- moderate
- approve
- reject
- hide
- flag

### Subscriptions

- create plan
- update price
- configure entitlements
- view subscriptions

### Payments

- view
- refund
- inspect webhook events

### CMS

- pages
- blog
- FAQs
- SEO metadata
- banners

### Reports

- user reports
- vendor reports
- review reports
- abuse reports

---

# 39. Audit Logs

Every important admin mutation should generate an audit log.

Example:

```text
ADMIN_APPROVED_VENDOR
ADMIN_SUSPENDED_VENDOR
ADMIN_UPDATED_PLAN
ADMIN_REJECTED_REVIEW
ADMIN_CHANGED_CATEGORY
ADMIN_FEATURED_VENDOR
```

Fields:

- actor_id
- action
- entity_type
- entity_id
- before JSONB
- after JSONB
- IP
- user_agent
- timestamp

---

# 40. Security Architecture

Implement:

- Helmet
- CORS
- rate limiting
- request validation
- SQL injection protection through ORM/parameterized queries
- XSS-safe output handling
- CSRF protection where cookie authentication requires it
- secure cookies
- password hashing
- authorization middleware
- webhook signature verification
- upload validation
- MIME validation
- file size limits
- signed object-storage uploads
- signed/private media URLs where needed
- secrets via environment/secret manager
- audit logs
- brute-force protection

Never trust:

- frontend roles
- frontend prices
- frontend subscription state
- frontend payment status
- uploaded MIME type alone
- external callback payload without verification

---

# 41. Rate Limiting

Different limits by endpoint type.

Example:

```text
Login              strict
OTP                very strict
Password reset     strict
Search             moderate
Vendor profile     high
Enquiry creation   strict
Reviews            strict
Admin APIs         strict
Telegram webhook   provider-aware
```

Use Redis when distributed rate limiting becomes necessary.

---

# 42. Validation

Every external request must be validated.

Validate:

- body
- params
- query
- headers where necessary
- webhook payloads

Example:

```text
POST /vendors

Validate:
businessName
categoryId
cityId
description
startingPrice
contact information
```

Reject malformed data before service logic.

---

# 43. Error Handling

Create centralized error classes:

```text
AppError
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
RateLimitError
ExternalServiceError
```

Global error middleware converts them into the standard API format.

Never expose:

- SQL errors
- stack traces
- secrets
- internal filesystem paths
- provider credentials

in production responses.

---

# 44. Logging

Use structured JSON logging.

Every request should ideally include:

```text
request_id
timestamp
method
path
status
duration
user_id
ip
```

Important events:

```text
AUTH_LOGIN
VENDOR_APPROVAL
LEAD_CREATED
PAYMENT_SUCCESS
PAYMENT_FAILED
SUBSCRIPTION_CHANGED
WEBHOOK_RECEIVED
MEDIA_PROCESSING_FAILED
```

---

# 45. Database Indexing Strategy

At minimum index:

```text
users.email
users.phone

vendors.slug
vendors.status
vendors.city_id

vendor_categories.vendor_id
vendor_categories.category_id

vendor_service_areas.vendor_id
vendor_service_areas.location_id

reviews.vendor_id
reviews.status

enquiries.vendor_id
enquiries.user_id
enquiries.created_at

leads.vendor_id
leads.user_id
leads.status
leads.created_at

subscriptions.vendor_id
subscriptions.status

payments.vendor_id
payments.status

notifications.user_id
notifications.created_at
```

Use composite indexes based on real query patterns.

Do not blindly index every column.

---

# 46. Slugs

Public SEO entities need stable slugs.

Examples:

```text
/vendors
/vendors/photographers
/vendors/photographers/toronto
/vendors/photographers/toronto/example-studio
```

Slugs must be:

- unique
- URL-safe
- stable
- regenerated carefully

Never use mutable names as database identifiers.

---

# 47. Soft Delete

Use soft deletion where historical relationships matter.

Examples:

- users
- vendors
- reviews
- media
- CMS content

Use:

```text
deleted_at
```

Do not automatically physically delete important business records.

---

# 48. Transactions

Use database transactions for multi-step business operations.

Example enquiry:

```text
BEGIN

create enquiry
create lead
create lead status history
create notification record

COMMIT
```

External notification delivery happens after commit through a job.

---

# 49. Concurrency

Protect against:

- duplicate payments
- duplicate leads
- double subscription activation
- duplicate featured placements
- race conditions during vendor approval
- media ownership conflicts

Use:

- unique constraints
- transactions
- row locks where required
- idempotency keys
- atomic updates

---

# 50. Environment Structure

Environments:

```text
development
staging
production
```

Variables:

```text
NODE_ENV
PORT
DATABASE_URL

JWT_SECRET
JWT_REFRESH_SECRET

REDIS_URL

R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_PUBLIC_BASE_URL

RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET

TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET

FRONTEND_URL
ADMIN_URL
```

Never commit real secrets.

---

# 51. Phase-by-Phase Implementation Plan

---

# PHASE 0 — Architecture & Repository Setup

## Goal

Create a clean backend foundation before implementing business features.

### Tasks

- [ ] Create backend repository
- [ ] Initialize Node.js project
- [ ] Configure TypeScript
- [ ] Configure ESLint
- [ ] Configure Prettier
- [ ] Configure Git
- [ ] Create `.gitignore`
- [ ] Create `.env.example`
- [ ] Create environment configuration module
- [ ] Create Express application
- [ ] Create HTTP server
- [ ] Create health endpoint
- [ ] Create `/api/v1` router
- [ ] Create error middleware
- [ ] Create request ID middleware
- [ ] Create structured logger
- [ ] Create base response format
- [ ] Create base error classes
- [ ] Create common utilities
- [ ] Create module directory structure
- [ ] Create README
- [ ] Add npm scripts

### Required scripts

```text
dev
build
start
lint
lint:fix
typecheck
test
test:unit
test:integration
test:e2e
db:migrate
db:seed
db:reset
```

### Acceptance criteria

- Server starts
- `/health` returns healthy
- `/api/v1` responds
- TypeScript compiles
- ESLint passes
- Environment validation works

---

# PHASE 1 — PostgreSQL & ORM Foundation

## Goal

Establish the database correctly before feature development.

### Tasks

- [ ] Install PostgreSQL ORM
- [ ] Configure DATABASE_URL
- [ ] Create Prisma/Drizzle schema
- [ ] Configure migrations
- [ ] Configure UUID strategy
- [ ] Configure timestamps
- [ ] Create database client singleton
- [ ] Create database health check
- [ ] Configure development database
- [ ] Configure staging database
- [ ] Document production database setup
- [ ] Add seed system

### First database models

- [ ] users
- [ ] user_profiles
- [ ] roles/permissions
- [ ] audit_logs

### Acceptance criteria

- Migration works from empty database
- Seed works
- Application connects correctly
- Database errors are handled
- No feature uses raw uncontrolled SQL

---

# PHASE 2 — Authentication & Authorization

## Goal

Build secure identity management.

### Tasks

- [ ] User registration
- [ ] Login
- [ ] Logout
- [ ] Password hashing
- [ ] Email verification foundation
- [ ] Password reset foundation
- [ ] Access token/session
- [ ] Refresh token strategy if applicable
- [ ] Session revocation
- [ ] Authentication middleware
- [ ] Role middleware
- [ ] Permission middleware
- [ ] Ownership policy system
- [ ] Rate limiting for auth
- [ ] Failed login tracking

### Roles

- [ ] END_USER
- [ ] VENDOR
- [ ] ADMIN
- [ ] SUPER_ADMIN

### Acceptance criteria

- Unauthorized requests rejected
- Users cannot access another user's private data
- Vendor cannot access another vendor's leads
- Admin permissions enforced server-side

---

# PHASE 3 — User Module

## Goal

Build the end-user account foundation.

### Tasks

- [ ] User profile CRUD
- [ ] Avatar support
- [ ] Contact preferences
- [ ] Notification preferences
- [ ] Wedding profile
- [ ] Account status
- [ ] Account deletion/anonymization
- [ ] User activity metadata

### Acceptance criteria

- User can update profile
- User can configure wedding information
- Private profile information is protected

---

# PHASE 4 — Category & Location Catalog

## Goal

Build the marketplace taxonomy.

### Tasks

- [ ] Category CRUD
- [ ] Subcategory CRUD
- [ ] Category ordering
- [ ] Category activation/deactivation
- [ ] Category attributes
- [ ] Location hierarchy
- [ ] Country
- [ ] State/province
- [ ] City
- [ ] Neighborhood
- [ ] Service areas
- [ ] Admin management APIs
- [ ] Seed initial wedding categories
- [ ] Seed initial target cities

### Acceptance criteria

- Categories are database-driven
- Locations are database-driven
- Vendor categories are not hardcoded
- Admin can modify catalog without deployment

---

# PHASE 5 — Vendor Module

## Goal

Build the core marketplace supply side.

### Tasks

- [ ] Vendor creation
- [ ] Vendor slug
- [ ] Vendor profile
- [ ] Category assignment
- [ ] Service areas
- [ ] Services
- [ ] Packages
- [ ] Pricing
- [ ] Contact details
- [ ] Social links
- [ ] Vendor status workflow
- [ ] Vendor ownership
- [ ] Admin-created vendor
- [ ] Vendor self-registration
- [ ] Vendor invitation
- [ ] Vendor approval
- [ ] Vendor rejection
- [ ] Vendor suspension
- [ ] Vendor profile completeness calculation

### Vendor workflow

```text
DRAFT
 ↓
PENDING_VERIFICATION
 ↓
PENDING_APPROVAL
 ↓
APPROVED
```

Alternative:

```text
REJECTED
SUSPENDED
DEACTIVATED
```

### Acceptance criteria

- Vendor can create profile
- Admin can approve vendor
- Only approved vendors appear publicly
- Vendor can update only owned profile
- Public vendor profile has stable SEO slug

---

# PHASE 6 — Media & Portfolio

## Goal

Build scalable vendor portfolio infrastructure.

### Tasks

- [ ] R2 integration
- [ ] Signed upload URL generation
- [ ] Upload authorization
- [ ] Media ownership
- [ ] Media metadata
- [ ] Albums
- [ ] Album ordering
- [ ] Album visibility
- [ ] Portfolio limits
- [ ] Image validation
- [ ] File-size validation
- [ ] MIME validation
- [ ] Thumbnail generation
- [ ] Large/medium variants
- [ ] Processing queue
- [ ] Media deletion
- [ ] Media moderation
- [ ] CDN URL strategy

### Acceptance criteria

- Images never pass through Node unnecessarily
- Portfolio survives backend restarts
- Invalid files are rejected
- Media permissions are enforced

---

# PHASE 7 — Search & Discovery

## Goal

Make vendor discovery useful and SEO-ready.

### Tasks

- [ ] Vendor keyword search
- [ ] Category filter
- [ ] Subcategory filter
- [ ] City filter
- [ ] Service-area filter
- [ ] Price filter
- [ ] Rating filter
- [ ] Verified filter
- [ ] Attribute filters
- [ ] Pagination
- [ ] Sorting
- [ ] Search relevance
- [ ] Search indexes
- [ ] PostgreSQL full-text search
- [ ] `pg_trgm`
- [ ] Vendor ranking service
- [ ] Featured listing integration
- [ ] Search analytics

### Acceptance criteria

- Search works with realistic catalog size
- Queries are indexed
- Search response time is monitored
- Search logic is abstracted from controller

---

# PHASE 8 — Favorites, Shortlists & Comparison

## Goal

Support high-intent users before lead conversion.

### Tasks

- [ ] Favorites
- [ ] Shortlists
- [ ] Shortlist items
- [ ] Rename shortlist
- [ ] Remove item
- [ ] Compare vendors
- [ ] Share shortlist foundation
- [ ] Analytics events

### Acceptance criteria

- User can save vendors
- User can create multiple shortlists
- Duplicate shortlist items are prevented
- Private shortlist access is enforced

---

# PHASE 9 — Enquiries & Leads

## Goal

Build the primary marketplace monetization engine.

### Tasks

- [ ] Enquiry creation
- [ ] Lead creation
- [ ] Lead status
- [ ] Lead status history
- [ ] Lead notes
- [ ] Lead assignment
- [ ] Vendor lead dashboard
- [ ] Lead filtering
- [ ] Lead search
- [ ] Lead deduplication
- [ ] Spam detection foundation
- [ ] Lead source tracking
- [ ] Contact information protection
- [ ] Lead notification events
- [ ] Lead analytics

### Acceptance criteria

- Every valid enquiry creates correct lead records
- Duplicate leads are controlled
- Vendor sees only their leads
- Admin can inspect all leads
- Lead status transitions are auditable

---

# PHASE 10 — Reviews & Trust

## Goal

Create trust signals that improve conversion.

### Tasks

- [ ] Review creation
- [ ] Review validation
- [ ] Review moderation
- [ ] Rating aggregation
- [ ] Review count
- [ ] Verified interaction flag
- [ ] Vendor response
- [ ] Review report
- [ ] Review abuse controls
- [ ] Admin review queue

### Acceptance criteria

- Vendors cannot create fake customer reviews through vendor-owned accounts
- Review moderation works
- Rating aggregation remains consistent

---

# PHASE 11 — Subscription & Billing Foundation

## Goal

Prepare monetization without hardcoding business rules.

### Tasks

- [ ] Subscription plans
- [ ] Configurable pricing
- [ ] Billing intervals
- [ ] Entitlements
- [ ] Vendor subscriptions
- [ ] Trial support
- [ ] Razorpay integration
- [ ] Checkout creation
- [ ] Payment verification
- [ ] Webhook verification
- [ ] Webhook idempotency
- [ ] Payment records
- [ ] Invoice records
- [ ] Subscription state machine
- [ ] Cancellation
- [ ] Expiry
- [ ] Past-due handling

### Initial plans

```text
FREE
PRO
PREMIUM
```

### Acceptance criteria

- Admin can change plan pricing
- Payment status comes from verified provider events
- Duplicate webhook does not duplicate subscription
- Subscription state remains consistent after retries

---

# PHASE 12 — Entitlement Enforcement

## Goal

Connect subscriptions to actual vendor benefits.

### Tasks

- [ ] Portfolio limits
- [ ] Video limits
- [ ] Lead visibility rules
- [ ] Analytics access
- [ ] Featured eligibility
- [ ] Promotional eligibility
- [ ] Priority exposure
- [ ] Profile enhancement features
- [ ] Plan feature middleware/service
- [ ] Upgrade flow
- [ ] Downgrade flow

### Important

Do not scatter plan checks throughout controllers.

Use:

```text
EntitlementService
```

Example:

```text
canVendorUse(vendorId, FEATURED_LISTING)
canVendorAccess(vendorId, ADVANCED_ANALYTICS)
canVendorUpload(vendorId, MEDIA)
```

---

# PHASE 13 — Featured Listings & Promotions

## Goal

Create an additional marketplace revenue channel.

### Tasks

- [ ] Featured listing model
- [ ] Placement types
- [ ] City placement
- [ ] Category placement
- [ ] Date scheduling
- [ ] Priority
- [ ] Payment connection
- [ ] Expiry
- [ ] Admin management
- [ ] Vendor purchase flow
- [ ] Reporting
- [ ] Impression/click tracking

---

# PHASE 14 — Notifications

## Goal

Create a reusable notification infrastructure.

### Tasks

- [ ] Notification service
- [ ] In-app notifications
- [ ] Email abstraction
- [ ] Email provider
- [ ] Notification preferences
- [ ] Template system
- [ ] Queue notifications
- [ ] Retry policy
- [ ] Dead-letter/failure handling
- [ ] Notification history

### Acceptance criteria

- Failed notification does not fail core transaction
- Notification retries are safe
- User preferences are respected

---

# PHASE 15 — Telegram Bot MVP

## Goal

Launch conversational discovery and enquiry through Telegram.

### Tasks

- [ ] Telegram bot creation
- [ ] Webhook endpoint
- [ ] Webhook verification/security
- [ ] Telegram user mapping
- [ ] Conversation model
- [ ] Message model
- [ ] State machine
- [ ] Category selection
- [ ] Location selection
- [ ] Date collection
- [ ] Budget collection
- [ ] Guest count
- [ ] Contact collection
- [ ] Vendor matching
- [ ] Vendor selection
- [ ] Enquiry confirmation
- [ ] Lead creation
- [ ] Vendor notification
- [ ] Error recovery
- [ ] Restart conversation
- [ ] Idempotency

### Acceptance criteria

A user can complete:

```text
Telegram
 → category
 → location
 → date
 → budget
 → vendor
 → enquiry
 → vendor notification
```

without manual admin intervention.

---

# PHASE 16 — Admin Platform Backend

## Goal

Give operations complete control over marketplace data.

### Tasks

- [ ] Admin dashboard APIs
- [ ] User management
- [ ] Vendor management
- [ ] Vendor approval queue
- [ ] Review moderation
- [ ] Category management
- [ ] Location management
- [ ] Lead management
- [ ] Subscription management
- [ ] Payment management
- [ ] Featured listing management
- [ ] CMS management
- [ ] Reports
- [ ] Audit logs
- [ ] Admin roles
- [ ] Permission management
- [ ] System settings
- [ ] Feature flags

---

# PHASE 17 — CMS & SEO Backend

## Goal

Support organic search growth.

### Tasks

- [ ] Static pages
- [ ] City pages
- [ ] Category pages
- [ ] Category + city pages
- [ ] Vendor SEO metadata
- [ ] Blog posts
- [ ] FAQs
- [ ] Internal linking metadata
- [ ] Canonical URL fields
- [ ] Meta title
- [ ] Meta description
- [ ] OG title
- [ ] OG description
- [ ] OG image
- [ ] Sitemap data
- [ ] Indexability status

Example routes supported by backend data:

```text
/vendors/photographers
/vendors/photographers/toronto
/vendors/venues/toronto
/vendors/makeup-artists/toronto
/vendors/photographers/toronto/vendor-name
```

---

# PHASE 18 — Analytics & Marketplace Metrics

## Goal

Understand the entire funnel.

### Tasks

- [ ] Event tracking
- [ ] Vendor profile views
- [ ] Search impressions
- [ ] Search-to-profile rate
- [ ] Profile-to-enquiry rate
- [ ] Enquiry-to-contact rate
- [ ] Lead response rate
- [ ] Lead conversion rate
- [ ] Subscription conversion
- [ ] Revenue tracking
- [ ] Featured listing performance
- [ ] Vendor analytics
- [ ] Admin analytics

Key funnel:

```text
Visitor
 ↓
Search
 ↓
Vendor View
 ↓
Enquiry
 ↓
Lead
 ↓
Contact
 ↓
Qualified
 ↓
Won
```

---

# PHASE 19 — Security Hardening

## Goal

Make the system production-safe.

### Tasks

- [ ] Dependency audit
- [ ] Rate limiting
- [ ] Security headers
- [ ] CORS restrictions
- [ ] Input validation audit
- [ ] Authorization audit
- [ ] File upload security
- [ ] Webhook security
- [ ] Secret rotation procedure
- [ ] Password policy
- [ ] Session revocation
- [ ] Admin MFA foundation
- [ ] Audit log verification
- [ ] Abuse detection
- [ ] Spam protection
- [ ] SQL/query review
- [ ] Production error redaction

---

# PHASE 20 — Testing

## Goal

Prevent regressions as the platform grows.

### Unit tests

Test:

- services
- policies
- validators
- ranking
- entitlement logic
- lead dedupe
- subscription state transitions

### Integration tests

Test:

- database operations
- auth
- vendor workflow
- enquiries
- leads
- payments
- reviews

### E2E tests

Test:

```text
User registration
→ vendor discovery
→ enquiry
→ lead
```

and:

```text
Vendor registration
→ approval
→ subscription
→ lead
```

and:

```text
Telegram
→ enquiry
→ lead
```

### Tasks

- [ ] Test framework
- [ ] Test database
- [ ] Unit test suite
- [ ] Integration suite
- [ ] E2E suite
- [ ] API contract tests
- [ ] Regression tests
- [ ] Coverage reporting

---

# PHASE 21 — Observability

## Goal

Make production debugging possible.

### Tasks

- [ ] Structured logs
- [ ] Request IDs
- [ ] Error tracking
- [ ] Performance metrics
- [ ] Database monitoring
- [ ] Queue monitoring
- [ ] Health endpoint
- [ ] Readiness endpoint
- [ ] Liveness endpoint
- [ ] External provider monitoring
- [ ] Alerting

Endpoints:

```text
/health
/health/live
/health/ready
```

---

# PHASE 22 — Docker & Deployment

## Goal

Make deployment reproducible.

### Tasks

- [ ] Dockerfile
- [ ] Multi-stage build
- [ ] Docker Compose development
- [ ] Production container
- [ ] PostgreSQL backup strategy
- [ ] Environment configuration
- [ ] Nginx/Caddy
- [ ] HTTPS
- [ ] Cloudflare configuration
- [ ] CI pipeline
- [ ] CD pipeline
- [ ] Database migration deployment
- [ ] Rollback strategy

Deployment:

```text
Internet
   ↓
Cloudflare
   ↓
Reverse Proxy
   ↓
Node API
   ↓
PostgreSQL
```

Workers:

```text
Node API
   ↓
Redis
   ↓
BullMQ Worker
```

---

# PHASE 23 — Backup & Disaster Recovery

## Goal

Protect business data.

### Tasks

- [ ] Automated PostgreSQL backups
- [ ] Backup retention
- [ ] Off-server backup
- [ ] R2 versioning where appropriate
- [ ] Restore test
- [ ] Disaster recovery documentation
- [ ] Database migration backup procedure
- [ ] Incident recovery runbook

Never consider a backup valid until restore has been tested.

---

# PHASE 24 — Performance Optimization

## Goal

Optimize only after measuring.

### Tasks

- [ ] API latency monitoring
- [ ] Slow query logging
- [ ] Database query analysis
- [ ] Index optimization
- [ ] Pagination optimization
- [ ] Cache hot data
- [ ] Redis caching where useful
- [ ] CDN optimization
- [ ] Image optimization
- [ ] Background job optimization
- [ ] Connection pool tuning
- [ ] Search optimization

Do not optimize based on assumptions.

---

# PHASE 25 — Production Readiness Review

## Final checklist

### Backend

- [ ] TypeScript strict mode
- [ ] Lint clean
- [ ] No debug logs
- [ ] No secrets committed
- [ ] Validation complete
- [ ] Error handling complete
- [ ] Authentication complete
- [ ] Authorization complete
- [ ] Rate limiting enabled
- [ ] Audit logging enabled

### Database

- [ ] Migrations tested
- [ ] Indexes reviewed
- [ ] Constraints reviewed
- [ ] Backup verified
- [ ] Restore tested
- [ ] Connection pool configured

### Payments

- [ ] Webhook signatures verified
- [ ] Idempotency implemented
- [ ] Refund flow tested
- [ ] Subscription state machine tested

### Media

- [ ] Signed uploads
- [ ] File validation
- [ ] Image processing
- [ ] CDN
- [ ] Access control
- [ ] Delete lifecycle

### Marketplace

- [ ] Vendor approval
- [ ] Search
- [ ] Enquiries
- [ ] Leads
- [ ] Reviews
- [ ] Featured listings
- [ ] Subscriptions

### Messaging

- [ ] Telegram webhook
- [ ] Conversation persistence
- [ ] Idempotency
- [ ] Failure handling

### Operations

- [ ] Admin APIs
- [ ] Audit logs
- [ ] Monitoring
- [ ] Alerts
- [ ] Backups
- [ ] Deployment rollback

---

# 52. Recommended Implementation Order

The practical dependency order is:

```text
PHASE 0
Foundation
   ↓
PHASE 1
PostgreSQL
   ↓
PHASE 2
Auth
   ↓
PHASE 3
Users
   ↓
PHASE 4
Categories + Locations
   ↓
PHASE 5
Vendors
   ↓
PHASE 6
Media
   ↓
PHASE 7
Search
   ↓
PHASE 8
Favorites + Shortlists
   ↓
PHASE 9
Enquiries + Leads
   ↓
PHASE 10
Reviews
   ↓
PHASE 11
Subscriptions + Payments
   ↓
PHASE 12
Entitlements
   ↓
PHASE 13
Featured Listings
   ↓
PHASE 14
Notifications
   ↓
PHASE 15
Telegram
   ↓
PHASE 16
Admin
   ↓
PHASE 17
CMS + SEO
   ↓
PHASE 18
Analytics
   ↓
PHASE 19
Security Hardening
   ↓
PHASE 20
Testing
   ↓
PHASE 21
Observability
   ↓
PHASE 22
Deployment
   ↓
PHASE 23
Backup/DR
   ↓
PHASE 24
Performance
   ↓
PHASE 25
Production Review
```

---

# 53. MVP Cut Line

Do not wait for every phase before launching.

A realistic MVP backend can launch after the core of:

```text
0 Foundation
1 Database
2 Auth
3 Users
4 Categories/Locations
5 Vendors
6 Media
7 Search
9 Enquiries/Leads
10 Reviews
11 Subscription foundation
14 Notifications
15 Telegram
16 Admin
17 SEO
```

The following can be enhanced after launch:

```text
Advanced analytics
Advanced ranking
WhatsApp
AI matching
Complex promotions
Pay-per-lead
Advanced CRM
Advanced recommendation engine
Search engine migration
```

---

# 54. Future Architecture Evolution

When traffic grows:

```text
                  ┌── Next.js
                  │
Cloudflare ───────┼── API
                  │
                  └── Static/CDN
                        │
                       API
                        │
             ┌──────────┼──────────┐
             ↓          ↓          ↓
         PostgreSQL   Redis      R2
             │          │          │
             └──────────┼──────────┘
                        ↓
                    Workers
```

Only extract services when there is a real scaling or ownership reason.

Possible future extraction:

```text
Search Service
Media Processing Service
Notification Service
Messaging Service
Payment Service
Analytics Pipeline
```

Do not extract them merely because the system contains modules.

---

# 55. Coding Rules

## Rule 1

Controllers do not contain business logic.

## Rule 2

Repositories do not contain business decisions.

## Rule 3

Services own business workflows.

## Rule 4

All external input is validated.

## Rule 5

All private resources require authorization.

## Rule 6

All external webhooks are verified and idempotent.

## Rule 7

All important business mutations use transactions.

## Rule 8

Do not hardcode business configuration.

Bad:

```text
if premium => 100 photos
```

Good:

```text
entitlement = subscriptionEntitlementService.get(...)
```

## Rule 9

Do not store media binaries in PostgreSQL.

## Rule 10

Do not introduce infrastructure before the product needs it.

---

# 56. Definition of Done for Every Phase

A phase is NOT complete simply because the API works.

Every phase should satisfy:

```text
Feature implemented
+
Validation
+
Authorization
+
Database constraints
+
Indexes where required
+
Error handling
+
Logging
+
Unit tests
+
Integration tests where relevant
+
Documentation
+
Migration
+
Seed data where required
+
Security review
```

---

# 57. Definition of Done for Every API Endpoint

For each endpoint:

- [ ] Route defined
- [ ] HTTP method correct
- [ ] Authentication requirement defined
- [ ] Authorization requirement defined
- [ ] Request schema defined
- [ ] Response schema defined
- [ ] Error codes defined
- [ ] Service method implemented
- [ ] Repository query implemented
- [ ] Transaction used where needed
- [ ] Logging added
- [ ] Tests added
- [ ] Documentation added

---

# 58. Recommended First Backend Milestone

The first useful milestone should be:

```text
User
  ↓
Browse categories
  ↓
Browse cities
  ↓
Search vendors
  ↓
Open vendor
  ↓
Submit enquiry
  ↓
Vendor receives lead
  ↓
Vendor updates lead
  ↓
Admin can monitor everything
```

Once this works reliably, add:

```text
Subscriptions
→ Featured listings
→ Telegram
→ Advanced analytics
```

This keeps the initial backend focused on the marketplace's actual core loop rather than infrastructure complexity.

---

# 59. North Star Backend Objective

The backend should optimize for one business loop:

```text
DISCOVERY
   ↓
TRUST
   ↓
ENQUIRY
   ↓
LEAD
   ↓
VENDOR RESPONSE
   ↓
CONVERSION
```

Every major backend module should ultimately support one of these stages or make the system safer, faster, or easier to operate.

---

# 60. Final Architecture Principle

WedHub should start as a **well-structured modular monolith backed by PostgreSQL**, with object storage for media, optional Redis for queues/cache, provider abstractions for payments and messaging, and strong API/module boundaries.

The architecture should be:

```text
Simple enough to build quickly
+
Structured enough to maintain
+
Secure enough for production
+
Modular enough to scale
+
Flexible enough for future monetization
```

The goal is not to build the most technically complicated backend.

The goal is to build the **smallest production architecture capable of supporting a serious wedding marketplace**, while preserving clear paths for future scale.
