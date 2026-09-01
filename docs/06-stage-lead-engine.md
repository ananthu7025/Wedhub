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

## Task Checklist

- [ ] Enquiry creation; lead creation; lead status; lead status history
- [ ] Lead notes; lead assignment; vendor lead dashboard
- [ ] Lead filtering; lead search; lead deduplication
- [ ] Spam-detection foundation; lead source tracking (`WEB/TELEGRAM/ADMIN/FUTURE_WHATSAPP`)
- [ ] Contact-information protection; lead notification events (hook only); lead analytics

## Acceptance Criteria

- Every valid enquiry creates correct lead records; duplicate leads are controlled; vendor sees only their own leads; admin can inspect all leads; lead status transitions are auditable.
- The three product.md example scenarios (§57 single-vendor, §58 multi-vendor with explicit consent, §59 venue with multi-shortlist-then-enquiry) must be walkable end-to-end.

## Dependencies / Sequencing

Depends on Stage 2 (vendors must exist) and Stage 3 (users discover/shortlist vendors before enquiring). **Does not depend on Stage 5 (Monetization)** — per product.md §54's free-plan principle ("do not make free vendors useless"), the lead loop must work fully on the FREE plan. This is a hard design constraint: **leads must never require a paid subscription to function.**

## Open Questions

- How much of "lead scoring" (product.md §18) is real weighted logic at MVP vs. a simpler rule-based pass deferred for later tuning — recommend starting rule-based (explicit disqualifiers: missing contact info, obvious spam pattern, duplicate window) rather than a scored model.
- **Telegram vendor-matching reuse** ([Risk 3](10-risks-and-open-questions.md#3-telegram-vendor-matching-reuse-confirm-not-a-gap)) — multi-vendor lead routing's "select N suitable vendors" step should reuse Stage 3's (Arch Phase 7) ranking/matching service rather than building separate selection logic. Confirm this reuse when designing the routing service here, since Stage 6's Telegram flow will need the same guarantee.
