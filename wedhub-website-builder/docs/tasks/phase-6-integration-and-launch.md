# Phase 6 — Integration and Launch

**Status:** Not started
**Depends on:** Phase 5 (full editing flow working end-to-end within `wedhub-website-builder`)
**Docs:** [../architecture/05-integration-with-wedhub-backend.md](../architecture/05-integration-with-wedhub-backend.md), [../architecture/06-performance-and-fallbacks.md](../architecture/06-performance-and-fallbacks.md), [../backend/04-database-and-migrations.md](../backend/04-database-and-migrations.md)

**This is the only phase that touches `wedhub-backend` itself.**

## Scope

- [ ] `wedhub-backend` migration: additive mirror columns on `WeddingWebsite` (`micrositeContentId`, `micrositeStatus`, `micrositeTemplateName`, `micrositePublicUrl`) per [../architecture/05-integration-with-wedhub-backend.md](../architecture/05-integration-with-wedhub-backend.md).
- [ ] `wedhub-backend`: new `/internal/microsite-webhook` receiver, mirroring the existing `WebhookEvent` idempotency pattern from `wedhub-backend/src/modules/webhooks/`.
- [ ] `wedhub-website-builder`: `WebhookOutboxEvent` delivery logic (enqueue-on-status-change, retry with backoff, mark `deliveredAt` on success).
- [ ] `wedhub-backend`: after Razorpay payment confirmation for `Payment.purpose = WEDDING_WEBSITE`, call `wedhub-website-builder`'s `POST /internal/website-content/:id/publish` (authenticated via shared internal secret).
- [ ] Finalize the public-read wiring decision (Option A direct vs. Option B proxied, per [../architecture/05-integration-with-wedhub-backend.md](../architecture/05-integration-with-wedhub-backend.md)) and implement it.
- [ ] `wedhub-frontend-app`: public renderer route per [../frontend/04-public-renderer.md](../frontend/04-public-renderer.md).
- [ ] Migrate the existing 3 enum templates (`ROYAL_WEDDING`, `MINIMAL_ELEGANT`, `TRADITIONAL_INDIAN`) into `Template` rows per [../backend/04-database-and-migrations.md](../backend/04-database-and-migrations.md) — one-time script, does not remove the old enum/rendering path.
- [ ] Confirm zero changes were needed/made to `wedhub-backend/src/modules/telegram/` — explicit verification step, not an assumption.
- [ ] Device/performance validation pass: Lighthouse/Core Web Vitals against a real scrub-heavy template page on a throttled mobile profile.

## Explicit non-goals for this phase

- No changes to Telegram flow — verify it still works unmodified, do not extend it to the new system.
- No requirement to fully retire the old fixed-enum path — it can coexist indefinitely as the Telegram-facing path.

## Done criteria

- Publishing a website end-to-end: user edits in the new editor → pays via the existing Razorpay flow in `wedhub-backend` → `wedhub-backend` confirms payment → calls the new service's publish endpoint → `WebsiteContent.status` becomes `PUBLISHED` → webhook fires back to `wedhub-backend` → `WeddingWebsite` mirror columns update → the public `/wedding/[publicSlug]` page is live and correctly rendered, including any `scrub_sequence`/`custom_html` sections from its template.
- Sending the same webhook event twice (simulated retry) results in exactly one mirror-column update on `wedhub-backend`'s side — confirms idempotency.
- A full manual run of the existing Telegram wedding-website creation flow still works, unmodified, producing a fixed-enum website with no `micrositeContentId` set.
- Lighthouse/Core Web Vitals results for a real scrub-heavy page on a throttled mobile profile meet an agreed threshold (define the specific threshold — e.g. LCP/CLS targets — at the start of this phase, informed by whatever real numbers Phase 4's device testing produced).
