# Stage 6 — Telegram & Admin

## Stage Goal

Ship the MVP conversational channel (Telegram) and the operational control plane (Admin) that lets staff run and moderate everything shipped in Stages 1–5.

## Included Architecture Phases

- **Arch Phase 14** — Notifications
- **Arch Phase 15** — Telegram Bot MVP
- **Arch Phase 16** — Admin Platform Backend

## Product Roadmap Cross-Reference

**Arch Phase 15 maps directly to Product Phase 6 — Telegram** (product.md §70). Notifications (14) and Admin (16) do not have a clean 1:1 Product Phase mapping:
- Notifications threads through Product Phases 1, 4, 5, and 6.
- Admin threads through Product Phase 1 (foundation), but its full breadth (subscription/payment views, CMS moderation) is not complete until Stages 4, 5, and 7 also exist.

**Admin is explicitly cross-cutting** — this stage file covers only its Arch-Phase-16-defined backend API surface (the operational control plane for what exists through Stage 5). It is *not* a claim that admin is fully done: admin CRUD for CMS extends further in Stage 7, and full subscription/payment admin views were scoped in Stage 5.

## Included Product Concerns

- Messaging-provider abstraction principle: Telegram must not become part of the core business domain; conceptual interface (`sendMessage`, `receiveMessage`, `sendMedia`, `createConversation`, `closeConversation`) with `TelegramProvider` today, `WhatsAppProvider`/`WebChatProvider` later — product.md §33.
- Full Telegram user journey (product.md §34) as an acceptance narrative: welcome → find a vendor → service → city → date → budget → recommendations → vendor selection → enquiry confirmation → lead created → vendor notified.
- Conversation state enum, persisted (not in-memory): `START/SELECTING_CATEGORY/SELECTING_LOCATION/COLLECTING_DATE/COLLECTING_BUDGET/COLLECTING_GUEST_COUNT/COLLECTING_CONTACT/MATCHING_VENDORS/SELECTING_VENDOR/CONFIRMING_ENQUIRY/COMPLETED` — product.md §35.
- Telegram idempotency: every incoming message/event needs an external identifier; store processed IDs; a retried webhook must not duplicate messages, leads, or notifications — product.md §36.
- Notification events, channels, and preferences: events (registration, verification, vendor approval/rejection, new lead, new message, review received, subscription activated, payment failed, subscription expiring, featured campaign started/ending); channels (in-app, email, Telegram, SMS/WhatsApp later); vendor/user notification preferences must be configurable — product.md §22, §45.
- Full admin dashboard section inventory — product.md §39: Dashboard (metrics), Vendors, Users, Categories, Locations, Leads, Subscriptions, Payments, Reviews, CMS, Analytics, Settings.
- Admin vendor-creation scenario (product.md §40) — cross-reference [Stage 2](04-stage-marketplace-supply.md), since vendor creation itself is Arch Phase 5; this stage only adds the admin-facing management surface.
- Content moderation states: `PENDING/APPROVED/REJECTED/HIDDEN/REMOVED` — product.md §42.
- Admin moderation scenario walkthrough (product.md §60): flagged media → admin reviews vendor/media/reason/date → hides image → full audit log recorded (admin ID, action, object, before/after status, timestamp, reason).

## Task Checklist

### Arch Phase 14 — Notifications ✅ Done — 2026-09-02
- [x] Notification service, in-app notifications
- [x] Email abstraction + provider (Resend), notification preferences, template system
- [x] Queue notifications, retry policy, dead-letter/failure handling, notification history

See [`11-progress-log.md`](11-progress-log.md#arch-phase-14--notifications) for the full write-up.

### Arch Phase 15 — Telegram Bot MVP
- [ ] Telegram bot creation, webhook endpoint, webhook verification/security
- [ ] Telegram user mapping, conversation model, message model, state machine
- [ ] Category selection, location selection, date collection, budget collection, guest count, contact collection
- [ ] Vendor matching (reuse Stage 3's ranking service — see Open Questions), vendor selection, enquiry confirmation
- [ ] Lead creation, vendor notification, error recovery, restart conversation, idempotency

### Arch Phase 16 — Admin Platform Backend
- [ ] Admin dashboard APIs; user management; vendor management + approval queue
- [ ] Review moderation; category management; location management; lead management
- [ ] Subscription management; payment management; featured-listing management
- [ ] CMS management (stub — full scope in Stage 7); reports; audit logs
- [ ] Admin roles, permission management, system settings, feature flags

## Acceptance Criteria

- A failed notification does not fail the core transaction it was queued from; retries are safe; user/vendor preferences are respected. — **Met**, verified live (Arch Phase 14, see progress log): a genuinely invalid Resend API key caused real delivery failures that were correctly retried, dead-lettered, and recorded — with the triggering action (e.g. user registration) succeeding regardless every time.
- A user can complete the full Telegram flow (category → location → date → budget → vendor → enquiry → vendor notification) without any manual admin intervention.
- Admin has a working CRUD/moderation/audit surface for every module shipped in Stages 1–5.

## Dependencies / Sequencing

Strict internal order Arch Phase 14 → 15 → 16 (architecture.md §52). Arch Phase 15 (Telegram) requires Arch Phase 9 (Leads, [Stage 4](06-stage-lead-engine.md)) and Arch Phase 7 (Search/ranking, [Stage 3](05-stage-discovery-engagement.md)) to already exist, since the bot creates enquiries/leads and matches vendors. Arch Phase 16 (Admin) requires essentially all of Stages 1–5 to exist, since it manages all their entities.

## Open Questions

- **Notifications/Telegram co-design dependency** ([Risk 7](10-risks-and-open-questions.md#7-notificationstelegram-co-design-dependency)) — Notifications' channel abstraction and Telegram's `MessagingProvider` abstraction must be co-designed even though built sequentially; do not finalize Arch Phase 14's channel interface without checking it against Arch Phase 15's actual needs. **Partially addressed in Arch Phase 14**: `NotificationChannel` already includes `TELEGRAM` as a first-class value (enum + `DEFAULT_CHANNELS` + delivery-processor branch), even though no channel currently defaults to it and its processor branch just logs a stub — Arch Phase 15 needs to implement real Telegram delivery inside that existing branch, not invent a new channel concept.
- **Telegram vendor-matching reuse** ([Risk 3](10-risks-and-open-questions.md#3-telegram-vendor-matching-reuse-confirm-not-a-gap)) — confirm the Telegram "recommend vendors" step reuses Stage 3's ranking/matching service rather than reimplementing matching logic independently.
- **New judgment calls resolved during Arch Phase 14** (confirmed with the user during implementation): (1) Arch Phase 9's narrow `lead-notification` BullMQ queue (5 lead-specific event types, stub processor) was retired entirely in favor of one generic `NotificationService`/`notifications` table covering all of product.md §45's 12 events plus the 5 lead events plus one extra (`PASSWORD_RESET`, not in product.md's literal list but needed to close a pre-existing stub in `auth.service.ts`) — avoids exactly the two-parallel-systems drift this stage's own Risk 7 warns about. (2) Default channels per event are asymmetric by design: account/business-critical events (registration, vendor approval/rejection, subscription/payment events, reviews, featured campaigns) default to EMAIL+IN_APP; high-frequency lead/message events default to IN_APP only, since emailing a vendor per-lead would be spammy — vendors can opt in via `NotificationPreference`. (3) `SUBSCRIPTION_EXPIRING` and `FEATURED_CAMPAIGN_STARTED`/`FEATURED_CAMPAIGN_ENDING` are declared (enum, template, default channels) but have no trigger yet — they need a look-ahead scheduler that doesn't exist anywhere in this codebase (same gap Arch Phase 12 hit for grace-period expiry), and building one was judged out of scope for this phase; same treatment for the never-wired `LEAD_REMINDER`/`USER_REPLIED`/`LEAD_FOLLOW_UP`/`HIGH_INTENT_LEAD` carried over from Arch Phase 9.
