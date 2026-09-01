# Cross-Cutting Reference

> Rules and standards referenced by every stage. Changes here apply platform-wide. **Do not duplicate these into stage files** — link back to this doc instead. If you're about to write a rule that isn't stage-specific, it belongs here.

See [`00-index.md`](00-index.md) for the Arch Phase / Product Phase numbering convention used throughout.

---

## Coding Rules (architecture.md §55)

| # | Rule | Why it matters | Most exercised by |
|---|---|---|---|
| 1 | Controllers do not contain business logic | Keeps HTTP concerns separate from workflow — controllers stay thin and testable | Every stage |
| 2 | Repositories do not contain business decisions | Query composition only; business rules belong one layer up | Every stage |
| 3 | Services own business workflows | Single place for transactions, authorization decisions, domain orchestration | Every stage |
| 4 | All external input is validated | Reject malformed data before it reaches service logic | Every stage |
| 5 | All private resources require authorization | Never rely on the frontend hiding a button | Every stage |
| 6 | All external webhooks are verified and idempotent | Payment/Telegram providers retry; duplicates must not create duplicate business records | Stage 5 (Monetization), Stage 6 (Telegram) |
| 7 | All important business mutations use transactions | Multi-step writes (e.g. enquiry → lead → notification) must commit atomically | Stage 4 (Lead Engine), Stage 5 (Monetization) |
| 8 | Do not hardcode business configuration (`if plan === "premium"` → use `entitlementService.can(...)`) | Plans/prices change without code changes | Stage 5 (Monetization) — see Arch Phase 12 |
| 9 | Do not store media binaries in PostgreSQL | Object storage + CDN only; DB stores metadata | Stage 2 (Marketplace Supply) |
| 10 | Do not introduce infrastructure before the product needs it | No premature microservices, no premature Redis, no premature search engine | All stages, especially Stage 7 |

## Definition of Done — Phase level (architecture.md §56)

Every Arch Phase, in every stage file, must satisfy all of:

```
Feature implemented
+ Validation
+ Authorization
+ Database constraints
+ Indexes where required
+ Error handling
+ Logging
+ Unit tests
+ Integration tests where relevant
+ Documentation
+ Migration
+ Seed data where required
+ Security review
```

A phase is **not** done just because the API works.

## Definition of Done — Endpoint level (architecture.md §57)

For every individual endpoint:

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

## Repo & module layout (architecture.md §4–5)

```text
wedhub-backend/
├── src/
│   ├── app.ts / server.ts
│   ├── config/            (env, database, redis, storage, logger)
│   ├── common/             (constants, enums, errors, middleware, types, utils, validators)
│   ├── modules/            (one folder per business domain — see below)
│   ├── jobs/               (queues, processors, schedules)
│   ├── integrations/        (payment, storage, telegram, email, sms)
│   └── routes/index.ts
├── prisma/ (schema.prisma, migrations/, seed.ts)
├── tests/ (unit/, integration/, e2e/)
```

Every module follows the same internal pattern:

```text
modules/<name>/
├── <name>.controller.ts   — HTTP request/response, auth context, calls service
├── <name>.service.ts      — business rules, transactions, workflow, authorization decisions
├── <name>.repository.ts   — DB queries only, no business rules
├── <name>.routes.ts
├── <name>.schema.ts       — request/query/response validation
├── <name>.types.ts
├── <name>.mapper.ts
├── <name>.policy.ts       — permission checks, ownership rules
└── index.ts
```

Module list (architecture.md §64): auth, users, vendors, categories, locations, services, packages, media, search, enquiries, leads, reviews, subscriptions, payments, featured-listings, notifications, messaging, telegram, analytics, cms, admin.

## API design standards (architecture.md §6–9, §43)

- Base URL versioned from day one: `/api/v1/...`. Never `/api/vendor` — always `/api/v1/vendors`.
- **Success response:**
  ```json
  { "success": true, "data": {}, "meta": {} }
  ```
- **Error response:**
  ```json
  { "success": false, "error": { "code": "VENDOR_NOT_FOUND", "message": "...", "details": {} } }
  ```
- **Pagination:**
  ```json
  { "success": true, "data": [], "meta": { "page": 1, "limit": 20, "total": 125, "totalPages": 7 } }
  ```
- Use consistent, machine-readable error codes.
- Centralized error classes: `AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `ExternalServiceError`. Global error middleware converts these to the standard format. Never expose SQL errors, stack traces, secrets, filesystem paths, or provider credentials in production responses.

## Authentication & authorization baseline (architecture.md §8–9)

Actors: `END_USER`, `VENDOR`, `ADMIN`.

```text
Register/Login → Credential verification → Session/access token
   → Authorization middleware → Role/policy validation → Controller
```

- RBAC plus resource-ownership policies (a vendor may read/update leads, but only leads assigned to *that* vendor).
- Backend must enforce every permission server-side — never rely on the frontend.
- Must support: email, phone, password, OTP (later), password reset, email verification, account lockout/rate limiting, session/token revocation, logout.
- Never store plain passwords, raw payment secrets, raw API secrets, or unsigned webhook data.

**Implemented in Arch Phase 2** (`src/modules/auth/`, `src/common/middleware/`, `src/common/policies/`) — every later module reuses these rather than reimplementing auth:
- `authenticateMiddleware` — verifies the JWT access token from the `Authorization: Bearer` header, attaches `req.user = { id, role }`.
- `authorize(...roles)` — role allow-list guard; use after `authenticateMiddleware` on any protected route.
- `assertOwnsResource(userId, resourceOwnerId)` (`common/policies/ownership.policy.ts`) — throws `AuthorizationError` on mismatch; the generic building block for "can this user touch this specific row."
- `validateBody(schema)` (`common/middleware/validate.middleware.ts`) — generic Zod request-body validator; every module's routes should use this rather than validating inline in controllers.
- `asyncHandler(fn)` (`common/utils/async-handler.util.ts`) — wraps async route handlers so a thrown/rejected error reaches `errorMiddleware` instead of becoming an unhandled rejection. **Every async controller method in every module must be wrapped in this** — Express 4 does not catch async errors on its own.
- Access tokens are short-lived (15 min) JWTs; refresh tokens are opaque, hashed at rest, rotated on every use, with reuse-detection that revokes a user's entire session chain if an already-rotated token is replayed. See `docs/11-progress-log.md`'s Arch Phase 2 entry for the full flow diagram.

## Security & abuse baseline (architecture.md §40–42; product.md §50, §52)

Implement across all stages as applicable: Helmet, CORS restrictions, rate limiting (see below), request validation, SQL-injection protection via ORM/parameterized queries, XSS-safe output handling, CSRF protection where cookie auth requires it, secure cookies, password hashing, webhook signature verification, upload/MIME/file-size validation, signed object-storage uploads, signed/private media URLs where needed, secrets via environment/secret manager, audit logs, brute-force protection.

**Rate limiting by endpoint class** (architecture.md §41):

| Endpoint type | Limit |
|---|---|
| Login | Strict |
| OTP | Very strict |
| Password reset | Strict |
| Search | Moderate |
| Vendor profile | High |
| Enquiry creation | Strict |
| Reviews | Strict |
| Admin APIs | Strict |
| Telegram webhook | Provider-aware |

**Abuse vectors to defend against** (product.md §52): fake vendor registrations, fake reviews, spam leads, automated scraping, duplicate enquiries, malicious media uploads, account takeover, payment fraud, API abuse.

Never trust: frontend roles, frontend prices, frontend subscription state, frontend payment status, uploaded MIME type alone, or an external callback payload without signature verification.

## Database conventions (architecture.md §45–49)

- **Soft delete** (`deleted_at`) for users, vendors, reviews, media, CMS content — never physically delete records with historical relationships.
- **Transactions** for every multi-step business operation (e.g. enquiry → lead → lead-status-history → notification record, all in one `BEGIN…COMMIT`). External notification delivery happens *after* commit, via a job.
- **Concurrency & idempotency**: protect against duplicate payments, duplicate leads, double subscription activation, duplicate featured placements, race conditions during vendor approval, media ownership conflicts — via unique constraints, transactions, row locks where required, idempotency keys, atomic updates.
- **Indexing baseline** — at minimum: `users.email`, `users.phone`, `vendors.slug`, `vendors.status`, `vendors.city_id`, `vendor_categories.vendor_id/category_id`, `vendor_service_areas.vendor_id/location_id`, `reviews.vendor_id/status`, `enquiries.vendor_id/user_id/created_at`, `leads.vendor_id/user_id/status/created_at`, `subscriptions.vendor_id/status`, `payments.vendor_id/status`, `notifications.user_id/created_at`. Use composite indexes based on real query patterns — do not blindly index every column.
- **Slugs** for public SEO entities must be unique, URL-safe, stable, and regenerated carefully. Never use a mutable display name as a database identifier.

## Environment & secrets baseline (architecture.md §50)

```text
NODE_ENV, PORT, DATABASE_URL
JWT_SECRET, JWT_REFRESH_SECRET
REDIS_URL
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
FRONTEND_URL, ADMIN_URL
```

Never commit real secrets. Referenced primarily by Stage 1 (initial setup) and Stage 7 (deployment).

## Final architectural rule (architecture.md §60, product.md §74)

```text
PostgreSQL      → business truth
Redis           → cache, queues, temporary state (never source of truth)
Object storage  → media
CDN             → media delivery
Workers         → asynchronous processing
Application     → business logic
Search engine   → optional specialized discovery layer
Messaging providers → Telegram/WhatsApp adapters
Payment providers   → external payment rails
```

No external provider becomes the source of truth for WedHub's business state. WedHub owns its users, vendors, leads, subscriptions, payments, reviews, conversations, and business rules.
