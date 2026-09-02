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

### Arch Phase 15 — Telegram Bot MVP ✅ Done — 2026-09-02
- [x] Telegram bot creation, webhook endpoint, webhook verification/security
- [x] Telegram user mapping, conversation model, message model, state machine
- [x] Category selection, location selection, date collection, budget collection, guest count, contact collection
- [x] Vendor matching (reuse Stage 3's ranking service — see Open Questions), vendor selection, enquiry confirmation
- [x] Lead creation, vendor notification, error recovery, restart conversation, idempotency

See [`11-progress-log.md`](11-progress-log.md#arch-phase-15--telegram-bot-mvp) for the full write-up, including two real idempotency bugs found and fixed (one in this phase's own code, one discovered in Arch Phase 11's Razorpay webhook handler while verifying the same pattern) and an honest note on what could and couldn't be verified against a live Telegram client on this machine.

### Arch Phase 16 — Admin Platform Backend
- [ ] Admin dashboard APIs; user management; vendor management + approval queue
- [ ] Review moderation; category management; location management; lead management
- [ ] Subscription management; payment management; featured-listing management
- [ ] CMS management (stub — full scope in Stage 7); reports; audit logs
- [ ] Admin roles, permission management, system settings, feature flags

## Acceptance Criteria

- A failed notification does not fail the core transaction it was queued from; retries are safe; user/vendor preferences are respected. — **Met**, verified live (Arch Phase 14, see progress log): a genuinely invalid Resend API key caused real delivery failures that were correctly retried, dead-lettered, and recorded — with the triggering action (e.g. user registration) succeeding regardless every time.
- A user can complete the full Telegram flow (category → location → date → budget → vendor → enquiry → vendor notification) without any manual admin intervention. — **Met at the code level, verified live end-to-end except for real Telegram message delivery** (Arch Phase 15, see progress log): all 11 conversation states, skip logic, invalid-input reprompting, and a real Enquiry/Lead creation with `source=TELEGRAM` were verified live against the real database and real Search/ranking service. Outbound message delivery to a real Telegram client could not be observed — this machine's managed endpoint security blocked the ngrok tunnel needed to receive real webhook deliveries — but every outbound send genuinely round-tripped to Telegram's real live API (`@VendorMatefinderBot`) and was correctly rejected for the synthetic test chat, proving the integration itself is real, not mocked. Flagged honestly rather than claimed as fully observed, the same pattern used for the Razorpay refund API in Arch Phase 11.
- Admin has a working CRUD/moderation/audit surface for every module shipped in Stages 1–5.

## Dependencies / Sequencing

Strict internal order Arch Phase 14 → 15 → 16 (architecture.md §52). Arch Phase 15 (Telegram) requires Arch Phase 9 (Leads, [Stage 4](06-stage-lead-engine.md)) and Arch Phase 7 (Search/ranking, [Stage 3](05-stage-discovery-engagement.md)) to already exist, since the bot creates enquiries/leads and matches vendors. Arch Phase 16 (Admin) requires essentially all of Stages 1–5 to exist, since it manages all their entities.

## Open Questions

- **Notifications/Telegram co-design dependency** ([Risk 7](10-risks-and-open-questions.md#7-notificationstelegram-co-design-dependency)) — Notifications' channel abstraction and Telegram's `MessagingProvider` abstraction must be co-designed even though built sequentially; do not finalize Arch Phase 14's channel interface without checking it against Arch Phase 15's actual needs. **Resolved in Arch Phase 15**: the `NotificationChannel.TELEGRAM` branch stubbed in Arch Phase 14 now calls the real `telegramProvider.sendMessage()` (via the linked `TelegramUser.chatId`, when one exists for the recipient) — no new channel concept was needed, confirming the co-design held.
- **Telegram vendor-matching reuse** ([Risk 3](10-risks-and-open-questions.md#3-telegram-vendor-matching-reuse-confirm-not-a-gap)) — confirm the Telegram "recommend vendors" step reuses Stage 3's ranking/matching service rather than reimplementing matching logic independently. **Resolved in Arch Phase 15**: `telegram.conversation.service.ts`'s vendor-matching step calls `searchRepository.searchVendors()` + `rankVendors()` directly — the exact same two functions `enquiry.service.ts`'s multi-vendor flow already uses — no separate matching logic was built.
- **New judgment calls resolved during Arch Phase 14** (confirmed with the user during implementation): (1) Arch Phase 9's narrow `lead-notification` BullMQ queue (5 lead-specific event types, stub processor) was retired entirely in favor of one generic `NotificationService`/`notifications` table covering all of product.md §45's 12 events plus the 5 lead events plus one extra (`PASSWORD_RESET`, not in product.md's literal list but needed to close a pre-existing stub in `auth.service.ts`) — avoids exactly the two-parallel-systems drift this stage's own Risk 7 warns about. (2) Default channels per event are asymmetric by design: account/business-critical events (registration, vendor approval/rejection, subscription/payment events, reviews, featured campaigns) default to EMAIL+IN_APP; high-frequency lead/message events default to IN_APP only, since emailing a vendor per-lead would be spammy — vendors can opt in via `NotificationPreference`. (3) `SUBSCRIPTION_EXPIRING` and `FEATURED_CAMPAIGN_STARTED`/`FEATURED_CAMPAIGN_ENDING` are declared (enum, template, default channels) but have no trigger yet — they need a look-ahead scheduler that doesn't exist anywhere in this codebase (same gap Arch Phase 12 hit for grace-period expiry), and building one was judged out of scope for this phase; same treatment for the never-wired `LEAD_REMINDER`/`USER_REPLIED`/`LEAD_FOLLOW_UP`/`HIGH_INTENT_LEAD` carried over from Arch Phase 9.
- **New judgment calls resolved during Arch Phase 15** (confirmed with the user during implementation): (1) `node-telegram-bot-api`'s `latest` npm tag (2.1.0) turned out to be a ground-up rewrite with a completely different middleware-based API, incompatible with `@types/node-telegram-bot-api` (which only ever tracked the classic `class TelegramBot` line) — pinned to `^1.2.0`, the classic line's last release, rather than adopting the new API for a first integration with far less prior art to lean on. (2) Category/city/vendor selection all use Telegram inline keyboards (fixed `callback_data`, zero parsing/ambiguity) per product.md §34's own numbered-option framing; only date/budget/guest-count use free-text parsing with a reprompt-on-failure loop, since those are genuinely open-ended fields with no reasonable finite button set. (3) `weddingDate`/`budget`/`guestCount`/`contactPhone` are all skippable via a "Skip" button, matching their actual nullability on `Enquiry` — a user isn't blocked from completing the flow by a field they don't want to answer yet. (4) A Telegram-sourced enquiry's `contactEmail` (a required, non-nullable column) is synthesized as `telegram_<telegramUserId>@wedhub.telegram` rather than making the column nullable — the real contact channel for that lead is Telegram/phone, not this placeholder, and every downstream consumer already treats `contactEmail` as opaque. (5) `createSingleVendorEnquiry()` (previously WEB-only, hardcoded `source: "WEB"`) gained optional `source`/`categoryId`/`cityId` parameters rather than a duplicate Telegram-specific function — product.md §34's journey ("user picks ONE vendor from a shortlist, confirms") is structurally `createSingleVendorEnquiry`'s shape, not `createMultiVendorEnquiry`'s auto-select-and-blast-three shape.
- **A real bug was caught and fixed during live idempotency verification, and the same bug was found in Arch Phase 11's already-shipped Razorpay webhook handler while checking for it:** the idempotency record was written *before* processing completed, so if outbound delivery genuinely failed on the first attempt (a real, live "chat not found" from Telegram's API against a synthetic test chat), the resulting non-2xx response would cause a real retry from Telegram/Razorpay — and that retry's identical `update_id`/`event_id` was then wrongly deduped as "already handled" by the row the failed first attempt had already inserted, silently losing a message/event that was never actually delivered or processed. This is the inverse of what Scenario D / product.md §36 exist to prevent (duplicate processing), but just as real. Fixed two ways to fit each table's actual shape: Telegram's `telegram_processed_updates` row is deleted before re-throwing on failure (verified live: a genuinely-failed `update_id`'s retry now correctly reprocesses instead of silently 200'ing); Razorpay's `webhook_events` row is kept (it's an audit log, deletion would destroy that history) but a duplicate-insert failure now checks `processedAt` on the existing row before deciding to skip — only a row that completed successfully is treated as a true duplicate, a still-failed row is retried. Both directions verified live: a true duplicate of a successfully-processed event still correctly deduped; a duplicate of a failed one now correctly reprocesses.
- **Live Telegram bot verification is partial, flagged honestly rather than claimed complete:** the real bot token (`@VendorMatefinderBot`) is configured and its identity was confirmed live via Telegram's own `getMe` API. Every outbound send in this phase's code genuinely calls Telegram's real API and was correctly rejected for synthetic test chat IDs that don't exist (`400 chat not found` / `400 query is too old`) — proving the integration is real, not a stub. However, receiving real webhook deliveries from Telegram requires a public HTTPS tunnel, and this machine's managed endpoint security (Sophos + an enforced AppLocker policy) blocked execution of the ngrok binary needed for that — confirmed via Windows CodeIntegrity/AppLocker event logs, not worked around per the user's explicit instruction not to touch the endpoint security configuration. The full conversation state machine (all 11 states, skip logic, invalid-input reprompting, real Enquiry/Lead creation) was instead verified by calling the same conversation-engine functions the webhook handler calls, directly and in sequence, against the real database — genuine business-logic verification, just not through a real Telegram client's UI.
