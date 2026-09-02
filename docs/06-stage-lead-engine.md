# Stage 4 — Lead Engine

## Stage Goal

Implement WedHub's core monetization/value loop: turn a user's interest into a vendor-actionable lead. This is the platform's north-star loop (product.md §69) and gets a dedicated, single-phase stage because of its centrality.

## Included Architecture Phases

- **Arch Phase 9** — Enquiries & Leads *(only — kept standalone deliberately, see `00-index.md` stage rationale)*

## Product Roadmap Cross-Reference

Maps to **Product Phase 4 — Lead Engine** (product.md §70: enquiries, lead routing, lead scoring, notifications, vendor lead dashboard). Note: full Notifications delivery is implemented in [Stage 6](08-stage-telegram-and-admin.md) (Arch Phase 14) — this stage only needs enough of a notification *hook* (queue a job after commit) to satisfy Arch Phase 9's acceptance criteria, not the complete notification service.

## Included Product Concerns

- Enquiry fields: name, email, phone, wedding date, wedding location, service, budget, guest count, message, preferred contact method — not every field mandatory for every category — product.md §17.
- Lead quality/scoring signals: real contact details, requested service, location, date, budget, genuine intent, no spam, no duplicate — product.md §18.
- Lead routing modes — product.md §19:
  - **Single-vendor enquiry**: user enquires directly with one vendor.
  - **Multi-vendor enquiry**: system selects a small number of suitable vendors; user must understand their request is shared with multiple vendors.
  - **Category request**: discovery-first, only creates a lead after explicit intent.
- Lead lifecycle: `NEW → CONTACTED → RESPONDED → QUALIFIED → MEETING → QUOTED → WON/LOST/SPAM/CLOSED`. Important: **vendor lead status is not necessarily the same as platform enquiry status** — keep these domain concepts separate — product.md §20.
- Lead deduplication: keys on user/vendor/contact-info/wedding-date/service + a recent-submission window; must avoid creating multiple billable leads from repeated submissions — product.md §21.
- Lead notification events (hooks only — full channel delivery is Stage 6): new lead, reminder, user replied, follow-up, high-intent — product.md §22.
- Vendor lead dashboard fields and analytics (leads received/contacted, response rate/time, qualified/won/lost, conversion rate) — product.md §23.
- Example scenarios as acceptance walkthroughs: single-vendor couple scenario (§57), multi-vendor recommendation scenario with explicit user consent (§58), multi-shortlist-then-enquiry venue scenario (§59).

## Task Checklist ✅ Done — 2026-09-02

- [x] Enquiry creation; lead creation; lead status; lead status history
- [x] Lead notes; lead assignment (a lead is inherently assigned to the vendor it was routed to at creation — no reassignment/team-routing exists yet since vendor team accounts aren't a WedHub concept); vendor lead dashboard
- [x] Lead filtering; lead search; lead deduplication
- [x] Spam-detection foundation (a `SPAM` terminal status a vendor/admin can set, which also flips `Lead.isSpam` — no automated spam-scoring model, matching the Open Questions recommendation below); lead source tracking (`WEB/TELEGRAM/ADMIN/FUTURE_WHATSAPP`)
- [x] Contact-information protection (full, unmasked access for the owning vendor immediately — no paywall gating, confirmed with the user against the FREE-plan constraint below); lead notification events (hook only); lead analytics

See [`11-progress-log.md`](11-progress-log.md#arch-phase-9--enquiries--leads) for the full write-up.

## Acceptance Criteria

- Every valid enquiry creates correct lead records; duplicate leads are controlled; vendor sees only their own leads; admin can inspect all leads; lead status transitions are auditable. — **Met.**
- The three product.md example scenarios (§57 single-vendor, §58 multi-vendor with explicit consent, §59 venue with multi-shortlist-then-enquiry) must be walkable end-to-end. — **Met**, walked live against real seeded vendors; see the progress log for exact results (including a real bug found and fixed in the §58 walkthrough).

## Dependencies / Sequencing

Depends on Stage 2 (vendors must exist) and Stage 3 (users discover/shortlist vendors before enquiring). **Does not depend on Stage 5 (Monetization)** — per product.md §54's free-plan principle ("do not make free vendors useless"), the lead loop must work fully on the FREE plan. This is a hard design constraint: **leads must never require a paid subscription to function.**

## Open Questions

- **"Lead scoring" (product.md §18) resolved as rule-based, not a scored model** — implemented as explicit disqualifiers (missing contact info rejected at the Zod validation layer; duplicate-window detection via `Lead.dedupeKey`) rather than a weighted quality score. Matches the original recommendation exactly; no scored-model version was built, and none is currently planned pending real usage data to tune against.
- **Telegram vendor-matching reuse** ([Risk 3](10-risks-and-open-questions.md#3-telegram-vendor-matching-reuse-confirm-not-a-gap)) — **Resolved for this phase**: `enquiry.service.createMultiVendorEnquiry()` reuses Arch Phase 7's `search.repository.searchVendors()` and `vendor-ranking.service.rankVendors()` directly rather than building separate selection logic. Stage 6 (Telegram) should reuse this same `enquiry.service` function (or the ranking service it calls) rather than reimplementing vendor matching a third time.
- **"Category request" (product.md §19's third routing mode) was confirmed NOT to be a distinct enquiry-creation pathway** — its description ("system shows a discovery/search experience, only creates leads after explicit intent") is exactly what Arch Phase 7's search flow already does, feeding into a `SINGLE_VENDOR` or `MULTI_VENDOR` enquiry once the user picks a vendor or requests recommendations. `EnquiryRoutingMode.CATEGORY_REQUEST` exists in the schema for completeness/future-proofing, but no `POST /enquiries/category-request` endpoint was built since there is nothing distinct for it to do.
- **Real bug found and fixed during the §58 walkthrough**: multi-vendor routing initially applied the user's `budget` as a hard `priceMax` filter, which excluded 3 of 4 otherwise-suitable photographers whose `startingPrice` sat only slightly above budget — reproducing a version of the exact "3 vendors selected" scenario returned only 1. Confirmed with the user and fixed by dropping the price filter from vendor selection entirely (budget is still recorded on the enquiry for vendors to see, just doesn't exclude anyone from being matched) — resolves cleanly with product.md §58's own example, where a "$4,000 budget" enquiry still surfaces three vendors rather than filtering hard.
- **Contact-information protection resolved as full, immediate, unmasked access** — confirmed with the user against the stage's hard FREE-plan constraint (leads must never require a paid subscription to function). No masking, no reveal-on-response gating, no distinction between list and detail views (`GET /leads` already includes each lead's full `enquiry` contact fields, not a redacted summary — since gating detail-only access would itself be a form of the paywall behavior explicitly ruled out). "Protection" instead means: never visible to another vendor (ownership-checked, 404 on mismatch — verified live), never visible unauthenticated (401 — verified live).
