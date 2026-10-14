# WedHub — Reusable WhatsApp Notification Channel (Implementation Plan)

**Document:** Implementation Plan — DRAFT, pending WhatsApp Business Platform account/provider
setup by the user before build starts on the sending side.
**Date:** 2026-09-30
**Depends on:** none outstanding for the design itself. Actual sending is blocked on the user
obtaining a WhatsApp Business Platform account, a chosen BSP/provider, and a Meta-approved
message template (see §7). Backend code can be written and merged before that exists — every
provider call is lazy-gated on env config, exactly like Razorpay/R2/Telegram/Resend already are
(`src/config/env.ts`).
**Feeds into:** `PLAN-2026-09-30-vendor-bulk-import-claim-flow.md`, which is the first real
consumer of this channel (OTP delivery to a vendor's phone during account claiming). This plan
is written standalone, not vendor-claim-specific, because the explicit requirement is that
WhatsApp sending be reusable across the app (lead alerts, approval notices, reminders, OTPs,
anything else that wants a WhatsApp message later) rather than a one-off built inside the claim
flow.

---

## 1. What changes, in one paragraph

WhatsApp becomes a first-class, reusable **notification channel** in the exact same architecture
the app already uses for Telegram and Email — not a special-cased helper bolted onto one feature.
`NotificationChannel` gains a fourth value, `WHATSAPP`. A new `WhatsAppProvider` is added to
`src/integrations/whatsapp/`, implementing a small send interface analogous to the existing
`MessagingProvider` (`src/integrations/telegram/messaging-provider.ts`) — which already names
`WhatsAppProvider` as the documented "later" extension point (see its file-header comment). A new,
dedicated `whatsapp-delivery` BullMQ worker (separate from the existing `notification-delivery`
worker — see §4c for why) handles **every** outbound WhatsApp send, queue-backed with retries,
backoff, and dead-lettering, whether or not the recipient has a `User` row yet. Any module in the
codebase that already knows how to call `notificationService.notify({..., eventType})` can request
WhatsApp delivery the same way it requests email or Telegram — no new call pattern to learn, no
per-feature integration work. A second, small entry point, `sendWhatsAppDirect()`, exists for flows
that need to reach a phone number *before* a `User` row exists (see §4c) — the vendor-claim OTP is
the first such case, but it is written generically, not claim-specific — and it is queue-backed
identically to `notify()`, not a synchronous side path, so both entry points inherit the same
retry, throttling, and 100+-concurrent-send behavior (§6) uniformly.

---

## 2. Current-state facts this plan is built on (confirmed 2026-09-30)

- `NotificationChannel` enum today: `IN_APP | EMAIL | TELEGRAM` (`schema.prisma:2317-2320`). The
  enum's own comment reads: `// SMS/WhatsApp are explicitly "later" per product.md §22 — not
  modeled yet.` This plan is that "later."
- `MessagingProvider` interface (`src/integrations/telegram/messaging-provider.ts:1-28`) already
  states the architectural intent explicitly in its header comment: *"TelegramProvider is the only
  implementation today; WhatsAppProvider/WebChatProvider are the named 'later' providers in the
  same section [of product.md §33]."* This plan fulfills that, reusing the same interface shape
  where it fits (see §4a for the one deliberate divergence).
- `notification-delivery.processor.ts`'s `deliverNotification()` (lines 66-105) already branches
  per-channel: `EMAIL` → `deliverEmail()` (Resend), `TELEGRAM` → looks up `TelegramUser`, sends via
  `telegramProvider`, no-ops as `SENT` if the recipient never linked Telegram. `IN_APP` is
  delivered synchronously elsewhere and never reaches this queue (throws if it does — line 104).
  `WHATSAPP` deliberately does **not** join this function as a fourth branch (see §4c) — it gets
  its own `whatsapp-delivery` queue/worker instead, because unlike `TELEGRAM` (always tied to an
  existing `User` via a linked `TelegramUser` row), WhatsApp needs to serve both an existing-`User`
  case and a no-`User`-yet case (the vendor-claim OTP) through one uniformly queue-backed
  mechanism — see §4c for the full reasoning, including why a shared queue with
  `notification-delivery` was considered and rejected.
- No SMS/WhatsApp provider dependency exists in `package.json` today (confirmed via dependency
  scan — zero packages matching `twilio|msg91|gupshup|whatsapp|otp`). `src/integrations/sms/`
  exists only as an empty `.gitkeep` stub.
- Every existing external integration (`razorpay.client.ts`, `r2.client.ts`,
  `resend.client.ts`, `telegram.client.ts`) follows the same pattern: lazy-init, gated on optional
  env vars, throws `ExternalServiceError` only when actually invoked unconfigured — the app boots
  fine without any of them present. The new `whatsapp.client.ts` follows this exact pattern (see
  §7).
- `env.ts`'s schema (`src/config/env.ts:1-64`) is the single source of truth for what external
  config exists; every optional integration's vars live there, validated by Zod, `.optional()`.
  New `WHATSAPP_*` vars are added here, not read via raw `process.env` elsewhere in the codebase
  (that would violate the existing convention — every other integration goes through `env`).
- `notify()` (the one generic entry point, `notification.service.ts`) already accepts an event
  type + recipient + data and fans out to every channel the recipient has enabled via
  `NotificationPreference` (opt-out model — no row means enabled) or a hardcoded default-channel
  table per event (`notification.constants.ts`). Adding `WHATSAPP` as a possible per-event default
  channel, or a preference a user/vendor can opt into, is additive to this existing table — no new
  fan-out mechanism needed.
- The codebase has **no phone-number-as-first-class-identity concept today** for `User` beyond the
  existing nullable `User.phone` column (used at registration/login as an alternate identifier,
  per `identifierSchema` in the frontend and the backend's equivalent). This is reused, not
  duplicated — see §4b.

---

## 3. Why a dedicated channel, not a one-off helper

The alternative — writing a `sendWhatsAppOtp()` function that lives inside the vendor-claim module
and calls a WhatsApp API directly — would work for that one feature but would need to be
rewritten (or copy-pasted) the next time anything else in the product wants WhatsApp: a lead
notification to a vendor's phone, a subscription-expiring reminder, a booking confirmation, a
"your listing was approved" ping. Given the product already has a working, proven pattern for
exactly this shape of problem (Telegram: provider interface + notification channel + queue-backed
delivery worker + opt-in preference), the reusable approach costs a small amount of extra
upfront structure (§4a-c below) in exchange for every future WhatsApp use case being "add an
event type to a table," not "write new integration code."

---

## 4. Design

### 4a. `WhatsAppProvider` — the sending interface

New file `src/integrations/whatsapp/whatsapp-provider.ts`, deliberately narrower than
`MessagingProvider` (Telegram's interface has `createConversation`/`closeConversation` because
Telegram has session semantics; WhatsApp Business Platform's Cloud API does not — messages are
either free-form within a 24-hour customer-service window, or **template messages** outside it,
which is the only kind relevant here since every message this plan sends is provider-initiated,
not a reply):

```ts
export interface WhatsAppTemplateMessage {
  to: string; // E.164 phone number, e.g. "+919876543210"
  templateName: string; // Meta-approved template name, e.g. "otp_verification"
  languageCode: string; // e.g. "en" or "en_US" — must match the approved template
  params: string[]; // positional template variables, e.g. [code] for "Your code is {{1}}"
}

export interface WhatsAppProvider {
  sendTemplateMessage(message: WhatsAppTemplateMessage): Promise<{ messageId: string }>;
}
```

Only template-message sending is modeled for this pass — free-form WhatsApp messaging (replying
inside an open 24-hour window, e.g. for the existing `messaging` module's couple↔vendor chat) is
explicitly **out of scope** here and would be a separate, later extension of this same interface
if ever wanted. Every use case this plan targets (OTPs, notification-style pings) is
provider-initiated and must use an approved template regardless, per WhatsApp Business Platform
policy — so this is not an artificial narrowing, it matches what is actually usable.

### 4b. Where the phone number comes from

Two distinct cases, both needed:

1. **A `User` already exists** (e.g. sending a `NEW_LEAD` WhatsApp ping to an existing vendor who
   opted in). Reuses the existing `User.phone` column — no new field.
2. **No `User` exists yet** (the vendor-claim OTP case, and potentially other future
   pre-account flows). There is nothing to attach a `Notification` row to (`Notification.userId`
   is a required FK). This is the same situation `vendor-admin.service.ts::createInvitation()`
   already has for the *email* side today (see its own comment, lines 61-66: *"Bypasses the
   notification service on purpose: the invitee has no User row yet... this is a raw
   transactional email to an address, not a notification about a user's own activity."*).

### 4c. One delivery mechanism for both cases — revised from the original draft

**Revision note:** an earlier draft of this section split case 1 and case 2 into two mechanisms —
case 1 queue-backed via `notify()`, case 2 a synchronous, directly-awaited
`sendWhatsAppDirect()` with no queue at all (copying the *shape* of the existing invitation-email
`try/catch` precedent at `vendor-admin.service.ts:67-81`, which is fine for email's low-volume,
low-retry-need use, but doesn't hold for WhatsApp once §6 (100+ concurrent sends) is in scope).
That split created exactly the weak point it should have avoided: a synchronous path with no
retries, no throttling, and no observability, which then had to be patched around by pushing
batching/throttling responsibility onto whichever plan calls it. **Corrected design below:
every outbound WhatsApp send is queue-backed, full stop** — the two cases differ only in what
the job payload carries, not in whether a queue is involved.

- **One queue, `whatsapp-delivery`** (`src/jobs/queues/whatsapp-delivery.queue.ts`), separate from
  `notification-delivery` rather than reusing it — see rationale below. Job payload is a discriminated
  union, not a bare `notificationId`:

  ```ts
  export type WhatsAppDeliveryJobData =
    | { kind: "notification"; notificationId: string } // case 1: User exists, Notification row already created PENDING
    | {
        kind: "direct"; // case 2: no User row — a normalized recipient phone travels in the job itself
        to: string; // E.164 phone number
        templateName: string;
        languageCode: string;
        params: string[];
      };
  ```

  This is the concrete fix for the critique: a `kind: "direct"` job for the vendor-claim OTP case
  gets the exact same retry policy, exponential backoff, worker concurrency (§6), and
  provider-rate-limit throttling as a `kind: "notification"` job — there is no second, weaker code
  path anymore. Nothing about this requires a `Notification`/`User` row to exist; the job carries
  everything `WhatsAppProvider.sendTemplateMessage()` needs directly.

- **Why a separate queue from `notification-delivery`, not a shared one:** `notification-delivery`
  today assumes every job resolves to a `Notification` row (`deliverNotification()` starts with
  `prisma.notification.findUnique(...)` and returns early if it's gone — see
  `notification-delivery.processor.ts:66-75`). Forcing `kind: "direct"` jobs through that same
  function means special-casing the one function every other channel already depends on, for the
  sake of a case that doesn't touch `Notification` at all. A dedicated `whatsapp-delivery` queue
  keeps `notification-delivery` untouched for `EMAIL`/`TELEGRAM`/existing-user `WHATSAPP` sends,
  and gets its own worker (`whatsapp-delivery.processor.ts`) that switches on `job.data.kind`:
  `"notification"` → same lookup-and-render logic as today's `TELEGRAM` branch (find `User.phone`,
  no-op as `SENT` if absent, render the notification content), `"direct"` → call
  `WhatsAppProvider.sendTemplateMessage()` straight from the payload, no DB read needed at all.
  Both branches end by writing an outcome (see below) and share one `concurrency`/throttle
  configuration (§6) — the two-branch worker is one process, one tunable, one place to observe
  WhatsApp throughput specifically, separate from Resend/Telegram volume.
- **`"direct"` jobs still need an outcome record for observability** (retries visible, dead
  letters visible, matching this project's existing "never lose a delivery attempt to a fire-and-
  forget call" standard — see notification-delivery's own Coding Rule 7 precedent). New minimal
  model `WhatsAppDirectSend` (id, to, templateName, status: PENDING/SENT/FAILED, attempts,
  lastError, createdAt) — deliberately not reusing `Notification` (whose `userId` FK this case has
  none for), but giving `"direct"` sends the same PENDING-row-before-enqueue /
  crash-safety property `Notification` already provides for case 1, and the same admin visibility
  (`Notification`'s dead-letter rows are what `admin-audit-logs`-adjacent tooling would look at
  today; `WhatsAppDirectSend` is this case's equivalent, queryable the same way).
- **Two thin entry points still exist at the call-site API level** (this part is unchanged from
  the original draft, and is fine — the critique is about the *delivery mechanism* underneath,
  not the call-site ergonomics):
  - `notify({ userId, eventType, data, ... })` — existing signature, unchanged. An existing `User`
    with a phone number and an opted-in preference gets a `WHATSAPP` `Notification` row created
    PENDING, then a `{ kind: "notification", notificationId }` job enqueued onto
    `whatsapp-delivery` (not `notification-delivery`) when the channel is `WHATSAPP` specifically —
    the one small branch `notification.service.ts` needs.
  - `sendWhatsAppDirect({ to, templateName, languageCode, params })` — same call signature as the
    original draft, but now its entire body is "create a `WhatsAppDirectSend` row PENDING, enqueue
    a `{ kind: "direct", ... }` job, return" — no network call happens inline, no `await` on the
    provider inside the caller's request path, no bulk-caller foot-gun. A caller sending 100
    vendor OTPs in a loop is now just enqueueing 100 lightweight jobs (already established as safe
    in §6's "batch-friendly enqueueing" point), not making 100 synchronous HTTP calls.

### 4d. Changes to existing files

- `schema.prisma`: `NotificationChannel` gains `WHATSAPP`. New `WhatsAppDirectSend` model (§4c).
  Both additive — safe migration, no backfill needed.
- `notification.constants.ts`: per-event default-channel table may optionally include `WHATSAPP`
  for specific events, if/when product decides a given event should default to it. **Not changed
  in this pass** — every existing event's default channels stay exactly as they are; WhatsApp
  starts opt-in only via `NotificationPreference`, avoiding an unreviewed blast of new WhatsApp
  sends (and their real per-message cost, see §7) to every existing user/vendor the moment this
  ships.
- `notification.service.ts`: `notify()` gains one small branch so a `WHATSAPP`-channel
  `Notification` enqueues onto `whatsapp-delivery` instead of `notification-delivery` (§4c) —
  every other channel's enqueue call is untouched.
- New `src/jobs/queues/whatsapp-delivery.queue.ts` and
  `src/jobs/processors/whatsapp-delivery.processor.ts` (§4c) — `notification-delivery.processor.ts`
  itself is **not modified**; this corrects the original draft's plan to add a branch there.
- `env.ts`: new optional vars (exact names depend on the chosen provider/BSP — see §7's open
  question), all `.optional()` so the app continues to boot with WhatsApp unconfigured, matching
  every other integration.
- `NotificationPreference`: no schema change needed — it is already channel-agnostic (stores
  which channels a user opted out of per event type); `WHATSAPP` just becomes a valid value
  wherever `NotificationChannel` is already accepted.
- `src/worker.ts`: register the new `whatsapp-delivery` worker alongside the existing three
  (§5 of the codebase survey — `media-processing`, `notification-delivery`,
  `profile-completion-reminder`).

### 4e. What is explicitly NOT built in this pass

- Free-form/session WhatsApp messaging (replying inside a customer-initiated 24-hour window) —
  not needed by any current use case; `messaging` module's couple↔vendor chat stays in-app only,
  unaffected by this plan.
- Inbound WhatsApp message handling (a webhook receiving replies) — this plan is send-only. If a
  future feature needs two-way WhatsApp (e.g. a WhatsApp-based conversation flow mirroring the
  Telegram bot), that is a materially larger piece of work (webhook receiver, signature
  verification, conversation state machine — the same shape as `src/modules/telegram/` took) and
  is out of scope here.
- Automatic default-channel changes to any existing `NotificationEventType` — see §4d.
- Delivery-status webhooks (read receipts, delivery confirmations from Meta) — `markSent` today
  means "handed to the provider successfully," matching how `EMAIL`/`TELEGRAM` already work; true
  delivery/read confirmation is a further enhancement, not required for OTP or notification
  correctness.

---

## 5. Rate limiting & abuse prevention

WhatsApp template messages have real per-message cost (see §7) and OTP-style sends are an obvious
abuse target (spamming a number, or running up cost by hammering "resend"). Two limiters needed,
following the existing `rate-limit.middleware.ts` pattern (`createRateLimiter()`,
env-var-overridable `max`):

- A new limiter guarding whichever endpoint(s) call `sendWhatsAppDirect()` for the OTP case
  (defined in the consuming plan, not here, since it's endpoint-specific).
- A per-recipient cooldown at the `whatsapp.service.ts` level itself (not just per-IP like the
  existing middleware) — e.g. "no more than 1 template send to the same phone number per 30-60
  seconds" — because a rate limiter keyed only on IP/route doesn't stop someone from triggering
  many sends to *different* numbers, or triggering the same OTP-resend repeatedly from different
  IPs. This is a new, small pattern not present elsewhere in the codebase today (worth building
  once here since any future WhatsApp-sending feature needs the same protection).

---

## 6. Throughput — handling 100+ notifications at once

Because §4c now routes **every** outbound WhatsApp send — both `notify()`-originated and
`sendWhatsAppDirect()`-originated — through the same queue-backed `whatsapp-delivery` worker, this
section is a single, uniform concern rather than two separate problems (a queue-side fix plus a
separately-flagged synchronous-caller risk, as the original draft had it).

- **`whatsapp-delivery`'s `Worker` needs an explicit `concurrency` set**, following the exact
  precedent already set by `media-processing.processor.ts:96` (`concurrency: 3`, chosen there
  because Sharp image processing is CPU-bound) — worth calling out because the sibling
  `notification-delivery` worker (`notification-delivery.processor.ts:108-122`) was built with
  **no `concurrency` option**, silently defaulting to BullMQ's default of `1` (strictly serial).
  That default would have been inherited here too if `whatsapp-delivery` were left unconfigured.
  WhatsApp delivery is I/O-bound (waiting on the provider's HTTP API), so a meaningfully higher
  number is safe and appropriate — e.g. `concurrency: 10` as a starting point, tunable via
  `WHATSAPP_DELIVERY_CONCURRENCY` (env-var-overridable, matching the rate-limiter-max convention
  elsewhere in this codebase) rather than a bare hardcoded literal.
- **Respect the WhatsApp provider's own rate limit independently of BullMQ concurrency** — raising
  worker concurrency makes the app capable of firing 10+ sends in parallel, but Meta/most BSPs cap
  how many messages an account can send per second (exact number is provider- and
  account-tier-dependent, confirmed only once §7.1's provider is chosen). Apply this via BullMQ's
  own `limiter` option on the queue (`{ max, duration }`, a first-class feature already available
  in this project's `bullmq` dependency, unused so far) on `whatsapp-delivery` specifically — so
  raising concurrency to drain a 100-vendor batch quickly doesn't itself get the WhatsApp account
  rate-limited or flagged by the provider. Exact numbers are a decision to make once the provider
  is chosen (§7.1), not something to guess at now; the mechanism (queue-level limiter) is decided.
- **Batch-friendly enqueueing works uniformly for both job kinds**: whether a caller enqueues a
  `{ kind: "notification" }` job (via `notify()`) or a `{ kind: "direct" }` job (via
  `sendWhatsAppDirect()`, now itself just an enqueue call per §4c's revision — no inline network
  call), queuing 100 of either back-to-back is a simple, safe, already-correct `queue.add()` loop
  against BullMQ/Redis. This is what closes the gap the earlier draft had flagged as unresolved: a
  bulk vendor-import script calling `sendWhatsAppDirect()` 100 times in a loop is now exactly as
  safe as calling `notify()` 100 times — both just enqueue and return immediately, and the
  worker's concurrency + provider-rate-limit settings above govern how fast the queue actually
  drains, uniformly, for either origin.
- **`WhatsAppDirectSend` rows (§4c) give the same at-a-glance batch visibility `Notification` rows
  already give** — e.g. "how many of the 100 vendors from this import batch have a `SENT`
  `WhatsAppDirectSend` row vs. still `PENDING` vs. `FAILED`" is a plain query against one table,
  not something that requires inferring state from provider-side logs.

---

## 7. Open questions — need a decision from the user before backend build starts

1. **Which BSP/provider?** (Meta direct Cloud API, or a Business Solution Provider — Gupshup,
   MSG91, Interakt, Twilio, etc.) Determines the exact `whatsapp.client.ts` implementation (each
   has a different REST API shape) and the exact env var names in §4d. The `WhatsAppProvider`
   interface in §4a is deliberately provider-agnostic so this decision doesn't block writing
   everything else in this plan — only `whatsapp.client.ts`'s internals wait on it.
2. **Message template content/name**, submitted to and approved by Meta before any real send can
   happen (typically a multi-day approval process, outside this codebase's control). At minimum
   one OTP-style template (e.g. *"Your itsmyKalyanam verification code is {{1}}. It expires in 10
   minutes."*) is needed for the consuming vendor-claim plan; additional templates can be added
   later per event type as more WhatsApp-notification use cases are turned on.
3. **Cost/budget owner** — per-message WhatsApp Business template pricing (provider- and
   country-dependent, India conversation-based pricing) is an ongoing operational cost, not a
   one-time setup cost; not a blocker for building the code, but should be confirmed before
   `WHATSAPP` is turned on as a default channel for any high-volume event type (e.g. `NEW_LEAD`,
   which can fire often).
4. **Sender display name/number** — the WhatsApp Business phone number and verified display name
   depend on the account the user sets up; not a code decision.

---

## 8. Suggested build order

1. Schema migration: add `WHATSAPP` to `NotificationChannel`, add the new `WhatsAppDirectSend`
   model (§4c) (trivial, additive, safe on the live `wedhub_prod` database — no data migration
   needed).
2. `src/integrations/whatsapp/whatsapp-provider.ts` (interface) +
   `src/integrations/whatsapp/whatsapp.client.ts` (real implementation once §7.1 is answered;
   can be stubbed/throw-if-unconfigured in the meantime so the rest of the plan can be built and
   merged without blocking on provider selection, matching how every other optional integration
   already boots unconfigured).
3. `env.ts`: add the new optional vars.
4. `src/jobs/queues/whatsapp-delivery.queue.ts` +
   `src/jobs/processors/whatsapp-delivery.processor.ts` (§4c) — the two-branch worker
   (`kind: "notification"` / `kind: "direct"`), built with the concurrency setting and
   provider-side throttle from §6 from the start, not added later. Register the worker in
   `src/worker.ts`. `notification-delivery.processor.ts` is untouched by this plan.
5. `notification.service.ts`: the one small branch so a `WHATSAPP`-channel `Notification` enqueues
   onto `whatsapp-delivery` instead of `notification-delivery` (§4d).
6. `whatsapp.service.ts`: `sendWhatsAppDirect()` (§4c) — now just a `WhatsAppDirectSend` row
   creation + enqueue, no inline network call, already batch-safe by construction for the
   vendor-claim plan's bulk use (no separate "make sure not to await this in a loop" caveat needed
   downstream, unlike the original draft).
7. Rate limiting (§5) and the per-recipient cooldown.
8. Load verification: confirm the worker actually drains a 100+-job backlog at the configured
   concurrency without erroring or falling behind, for **both** job kinds (`notification` and
   `direct`) — a local test can enqueue 100+ synthetic jobs of each kind against a stub/sandbox
   provider to observe this, independent of whether real WhatsApp credentials exist yet — in
   addition to the standard functional checks below.
9. Functional verification: confirm `notify()` correctly queues a `WHATSAPP` notification for a
   test user with a phone number and an opted-in preference, and that `sendWhatsAppDirect()`
   correctly creates a `WhatsAppDirectSend` row and delivers via the same worker — both against
   whichever provider sandbox/test mode is available once §7.1-2 are resolved. If no real provider
   credentials exist yet at implementation time, this must be flagged honestly as unverified-live
   (per this project's verification-bar convention — `npx tsc --noEmit` clean is necessary but not
   sufficient), not claimed as tested.

---

## 9. Relationship to the vendor-claim OTP flow

This plan is intentionally self-contained and provider/feature-agnostic. The vendor bulk-import
claim flow (separate plan) is simply the **first caller** of `sendWhatsAppDirect()` — it does not
special-case WhatsApp internally at all; it just picks a channel (email via existing `sendEmail()`,
or WhatsApp via this plan's new function) based on whether the vendor's collected contact was an
email or a phone number, and calls the appropriate one. Any future feature that wants to reach a
vendor or couple on WhatsApp — for a notification, a reminder, a status update — uses the same
`notify()`/`sendWhatsAppDirect()` entry points this plan builds, not a new integration.
