# Stage 1 — Foundation

## Stage Goal

Establish the repository, database, authentication, user accounts, and category/location catalog substrate. Nothing in this stage is user-visible, but every later stage depends on it existing and being correct.

## Included Architecture Phases

- **Arch Phase 0** — Architecture & Repository Setup
- **Arch Phase 1** — PostgreSQL & ORM Foundation
- **Arch Phase 2** — Authentication & Authorization
- **Arch Phase 3** — User Module
- **Arch Phase 4** — Category & Location Catalog

## Product Roadmap Cross-Reference

Maps in full to **Product Phase 1 — Foundation** (product.md §70: architecture, PostgreSQL schema, authentication, RBAC, core infrastructure, admin foundation).

## Included Product Concerns

- User types/actors — End User, Vendor, Admin, and admin role examples (Operations Admin, Vendor Manager, Sales, Finance, Content Manager, Moderator, Support) — product.md §4
- End-user account fields and optional wedding profile (name, email, phone, partner info, wedding date/location, guest count, budget, preferred categories) — product.md §14
- Category system: dynamic, admin-managed, database-driven, with category-specific attributes and filters — product.md §7
- Location hierarchy: Country → State/Province → City → Area, with vendor service areas distinct from primary location — product.md §8
- Database table baseline for this stage: `users`, `user_profiles`, `wedding_profiles`, `categories`, `category_attributes`, `locations`, `roles`, `permissions`, `role_permissions`, `admin_users`, `audit_logs` — product.md §47

## Task Checklist

### Arch Phase 0 — Architecture & Repository Setup ✅ Done — 2026-09-02
- [x] Create backend repository, initialize Node.js + TypeScript
- [x] Configure ESLint, Prettier, Git, `.gitignore`, `.env.example`
- [x] Environment configuration module
- [x] Express application, HTTP server, health endpoint
- [x] `/api/v1` router, error middleware, request ID middleware, structured logger
- [x] Base response format, base error classes, common utilities
- [x] Module directory structure, README
- [x] npm scripts: `dev, build, start, lint, lint:fix, typecheck, test, test:unit, test:integration, test:e2e, db:migrate, db:seed, db:reset` (`db:*` intentionally stubbed to fail with a message until Arch Phase 1 wires up Prisma)

See [`11-progress-log.md`](11-progress-log.md#arch-phase-0--architecture--repository-setup) for the full write-up.

### Arch Phase 1 — PostgreSQL & ORM Foundation ✅ Done — 2026-09-02
- [x] Install ORM (Prisma/Drizzle), configure `DATABASE_URL`
- [x] Create schema, configure migrations, UUID strategy, timestamps
- [x] Database client singleton, database health check
- [x] Configure development/staging databases, document production setup (dev only for now — staging/production documented as a later-phase task, not blocking)
- [x] Seed system
- [x] First models: `users`, `user_profiles`, `roles`/`permissions`, `audit_logs`

See [`11-progress-log.md`](11-progress-log.md#arch-phase-1--postgresql--orm-foundation) for the full write-up.

### Arch Phase 2 — Authentication & Authorization ✅ Done — 2026-09-02
- [x] Registration, login, logout
- [x] Password hashing, email verification foundation, password reset foundation
- [x] Access token/session, refresh token strategy if applicable, session revocation
- [x] Authentication middleware, role middleware, permission middleware
- [x] Ownership policy system (foundation only — genuinely enforced once Stage 2 adds owned resources)
- [x] Rate limiting for auth, failed login tracking
- [x] Roles: `END_USER`, `VENDOR`, `ADMIN`

See [`11-progress-log.md`](11-progress-log.md#arch-phase-2--authentication--authorization) for the full write-up.

### Arch Phase 3 — User Module
- [ ] User profile CRUD, avatar support
- [ ] Contact preferences, notification preferences
- [ ] Wedding profile
- [ ] Account status, account deletion/anonymization
- [ ] User activity metadata

### Arch Phase 4 — Category & Location Catalog
- [ ] Category CRUD, subcategory CRUD, ordering, activation/deactivation
- [ ] Category attributes
- [ ] Location hierarchy: country, state/province, city, neighborhood, service areas
- [ ] Admin management APIs for both
- [ ] Seed initial wedding categories and target cities

## Acceptance Criteria

- Server starts; `/health` returns healthy; `/api/v1` responds; TypeScript compiles; ESLint passes; environment validation works.
- Migration works from an empty database; seed works; application connects correctly; database errors are handled; no feature uses raw uncontrolled SQL.
- Unauthorized requests are rejected; users cannot access another user's private data; vendors cannot access another vendor's leads (verified once Stage 2/4 exist, but the policy mechanism must be in place now); admin permissions are enforced server-side.
- User can update their profile and configure wedding information; private profile information is protected.
- Categories and locations are database-driven, not hardcoded; admin can modify the catalog without a deployment.

## Dependencies / Sequencing

Strictly linear: Arch Phase 0 → 1 → 2 → 3 → 4, matching architecture.md §52 exactly for this range — no branching. **Nothing in Stage 2 onward can start before this stage's acceptance criteria are met.**

## Open Questions

- **Verification-level enum mismatch** ([Risk 6](10-risks-and-open-questions.md#6-verification-level-enum-mismatch)) — not implemented in this stage, but the `admin_users`/roles schema design here should leave room for whichever verification enum is eventually chosen, so Stage 2 doesn't require a schema rework.
