# Integration with wedhub-backend

This service is isolated (own DB, own Redis, own deploy — see [01-overview.md](01-overview.md)) but not disconnected. This doc defines the exact, narrow seam between the two services. Nothing outside what's listed here should couple them.

## 1. Authentication — JWT verification only, no shared user table

- `wedhub-backend` remains the only identity provider. It issues the JWT users already carry from login.
- This service verifies that JWT (`src/modules/auth/jwt-verify.middleware.ts`) using the same signing secret / JWKS endpoint — it does **not** query `wedhub-backend`'s database, and does **not** maintain its own `User` table.
- Every user-identifying column in this service's schema (`Template.createdByUserId`, `WebsiteContent.ownerUserId`) is the opaque `sub` claim from that verified token — see [02-data-model.md](02-data-model.md).
- Admin-only endpoints (template authoring) additionally check a role/claim on the same JWT (mirroring however `wedhub-backend` already encodes admin/vendor/end-user roles) — no separate admin login for this service.

## 2. Inbound: how content gets rendered/served

Two viable wiring options (finalize during Phase 6 implementation, not blocking earlier phases):

- **Option A — direct.** `wedhub-frontend-app` calls this service's public API directly for gallery browsing, editor state, and the public rendered page data, using the same JWT from `wedhub-backend` login. `wedhub-backend` is not in the read path at all for this feature.
- **Option B — proxied.** `wedhub-backend`'s existing public route (`/wedding/[slug]`) proxies the read to this service server-side, keeping one canonical public URL scheme.

Current default assumption: **Option A** for gallery/editor (least indirection), with the final public `/wedding/[slug]` URL scheme decided in Phase 6 once both services exist to test against.

## 3. Outbound: status-sync webhook (the only thing "pulled" back to wedhub-backend)

`wedhub-backend` needs enough visibility to run its own admin dashboards, vendor/user listings, and SEO metadata **without** a live cross-service call on every read. The mechanism:

- Whenever a `WebsiteContent` row's `status` changes (or its template/public slug changes), this service enqueues a `WebhookOutboxEvent` (see [02-data-model.md](02-data-model.md)) and delivers it via `POST` to a new endpoint on `wedhub-backend`, e.g. `/internal/microsite-webhook`.
- This **mirrors the existing idempotent webhook pattern** already used for Razorpay in `wedhub-backend/src/modules/webhooks/` (event keyed by id, safe to retry/duplicate-deliver).
- `wedhub-backend` handles the webhook by updating a small set of **mirror columns** on its existing `WeddingWebsite` row — new nullable fields added in a Phase 6 migration:

```prisma
// additive migration on wedhub-backend's existing WeddingWebsite model
micrositeContentId    String?   @map("microsite_content_id") @db.Uuid
micrositeStatus       String?   @map("microsite_status")
micrositeTemplateName String?   @map("microsite_template_name")
micrositePublicUrl    String?   @map("microsite_public_url")
```

- These mirror fields are **denormalized read replicas**, not the source of truth — `wedhub-backend`'s admin/dashboard/search queries read them locally (fast, no cross-service call), while this service's own database remains authoritative for the actual content.
- **Not** a scheduled/batch sync — event-driven webhook only, matching the existing Razorpay pattern's idempotency guarantees and avoiding a "nightly job copying rows" staleness window.

## 4. Payments and publish-gating — stays entirely in wedhub-backend

- This service **never checks payment state**. `wedhub-backend` remains the only source of truth for the ₹49 payment (`Payment.purpose = WEDDING_WEBSITE`, existing Razorpay webhook flow).
- After `wedhub-backend` confirms payment server-side, it calls a simple authenticated endpoint on this service (e.g. `POST /internal/website-content/:id/publish`) to flip `WebsiteContent.status` to `PUBLISHED`.
- This mirrors the existing design decision already recorded for the current feature (`archive/backend/12-stage-wedding-website.md` §2, "Payment model fit") — this project does not change that decision, it just adds a second consumer of the same "payment confirmed → publish" signal.

## 5. Telegram — explicitly not integrated

No code in `wedhub-backend/src/modules/telegram/` changes. Telegram-created `WeddingWebsite` rows simply never acquire a `micrositeContentId` and continue rendering via the existing fixed-enum/flat-column path indefinitely. Do not add any Telegram-awareness to this service.

## Summary of the seam surface (everything else is out of bounds)

| Direction | Mechanism | Purpose |
|---|---|---|
| `wedhub-backend` → this service | JWT (verified, not queried) | User/admin identity |
| `wedhub-backend` → this service | Authenticated internal POST | Publish gate after payment confirmed |
| This service → `wedhub-backend` | Idempotent webhook | Mirror status/template/URL onto `WeddingWebsite` |
| `wedhub-frontend-app` → this service | Direct API calls (JWT) | Gallery, editor, public content read |
