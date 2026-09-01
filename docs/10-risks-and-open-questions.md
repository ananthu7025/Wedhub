# Risks & Open Questions

> Canonical log of every cross-doc conflict or ambiguity found between `product.md` and `wedhub_backend_architecture.md`. Stage files link back to the specific entry relevant to them with a one-line pointer — full analysis lives here, once, not duplicated across stage files.

**Convention for future contributors:** append new entries here first, then cross-link from affected stage files. Never the reverse.

**Entry format:** Title / Source citations / Description / Impact / Recommendation / Status / Related stage file(s).

---

## 1. Arch Phase 8/12 MVP gap

- **Citations:** architecture.md §53 (MVP Cut Line)
- **Description:** The MVP phase list explicitly includes Arch Phases 0,1,2,3,4,5,6,7,9,10,11,14,15,16,17 — skipping Arch Phases 8 and 12. But the same section's "post-launch" list only names items that map to Arch Phase 13 (Complex promotions), Arch Phase 18 (Advanced analytics), Arch Phase 7-extensions (Advanced ranking, Search engine migration), product.md §37/§38 (WhatsApp, AI matching, no Arch Phase), and product.md §31-32 (Pay-per-lead, no Arch Phase). Nothing in the post-launch list corresponds to Arch Phase 8 (Favorites/Shortlists) or Arch Phase 12 (Entitlement Enforcement).
- **Impact:** Ambiguous whether these two phases were deliberately or accidentally omitted from MVP scope.
- **Recommendation:** Resolved in [`02-mvp-cut-line.md`](02-mvp-cut-line.md) — include both in MVP (Arch Phase 8 because product.md's own scenarios require it; Arch Phase 12 minimally because Coding Rule 8 and Subscription Scenario B require some entitlement mechanism).
- **Status:** Resolved — see `02-mvp-cut-line.md`.
- **Related stage files:** [05-stage-discovery-engagement.md](05-stage-discovery-engagement.md), [07-stage-monetization.md](07-stage-monetization.md)

## 2. Reviews phase-alignment mismatch

- **Citations:** architecture.md §51 (Arch Phase 10 "Reviews & Trust", sequenced after Search/Favorites), product.md §70 (Product Phase 3 "User Discovery" groups reviews with search/favorites/shortlists/SEO)
- **Description:** product.md treats reviews as part of the same coarse business phase as discovery. architecture.md gives reviews a dedicated, later technical phase (Arch Phase 10), after Search (Arch Phase 7) and Favorites (Arch Phase 8).
- **Impact:** Not a hard contradiction — both land in MVP — but a reader could wrongly assume "Product Phase 3 done" implies reviews have shipped, when Arch Phase sequencing might land them slightly later within that same window.
- **Recommendation:** Note explicitly in Stage 3's Open Questions that reviews sub-ship after search/favorites within the same stage, and confirm this is acceptable before the stage is scheduled.
- **Status:** Open — informational, no action required beyond awareness.
- **Related stage files:** [05-stage-discovery-engagement.md](05-stage-discovery-engagement.md)

## 3. Telegram vendor-matching reuse (confirm, not a gap)

- **Citations:** product.md §34 (Telegram User Journey — implies vendor recommendation/matching), architecture.md §18 (Arch Phase 7 introduces the Vendor Ranking service)
- **Description:** The Telegram walkthrough implies a matching/ranking capability. That capability is already introduced in Arch Phase 7 (Search & Discovery), well before Telegram (Arch Phase 15). No gap exists — but neither source doc states outright that Telegram should *reuse* the Arch Phase 7 ranking service rather than reimplementing its own matching logic.
- **Impact:** Risk of duplicate matching/ranking logic being built if this isn't confirmed explicitly during implementation.
- **Recommendation:** Stage 6 (Telegram & Admin) must explicitly confirm and design against reusing Stage 3's ranking service for the Telegram "recommend vendors" step.
- **Status:** Open — needs confirmation during Stage 6 design, not a doc conflict.
- **Related stage files:** [08-stage-telegram-and-admin.md](08-stage-telegram-and-admin.md)

## 4. Entitlements still required even if Featured Listings is thinned/deferred

- **Citations:** product.md §28 Scenario B (subscription upgrade flow, step 9: "Feature entitlements are updated"), architecture.md §53 (Arch Phase 13 excluded from MVP), architecture.md §26 (Entitlements principle)
- **Description:** If Featured Listings (Arch Phase 13) ships only as a thin admin-CRUD slice at MVP (per `02-mvp-cut-line.md`), one might assume Entitlements (Arch Phase 12) could also be fully deferred. It cannot — Pro/Premium plans still need to gate portfolio limits, video limits, and analytics access at MVP, all of which require some entitlement mechanism regardless of whether Featured Listings is fully built.
- **Impact:** Under-scoping Arch Phase 12 because Arch Phase 13 is deferred would break basic Pro/Premium plan value delivery.
- **Recommendation:** Stage 5 (Monetization)'s Open Questions section must spell out that Arch Phase 12's core checks (portfolio/analytics gating) are required at MVP independent of Arch Phase 13's fate.
- **Status:** Resolved — see `02-mvp-cut-line.md` and Stage 5.
- **Related stage files:** [07-stage-monetization.md](07-stage-monetization.md)

## 4b. Featured Listings MVP contradiction

- **Citations:** product.md §66 (lists "Featured listing foundation" under MVP Business scope), architecture.md §53 (excludes Phase 13 entirely from MVP via "Complex promotions")
- **Description:** Direct contradiction — one source doc calls it MVP, the other defers it.
- **Impact:** Scope ambiguity for Phase 13 specifically.
- **Recommendation:** Thin-slice resolution — ship only the data model + admin CRUD for featured listings at MVP; defer campaign automation, vendor self-purchase, and placement logic. See `02-mvp-cut-line.md` §3 for full reasoning.
- **Status:** Resolved — see `02-mvp-cut-line.md`.
- **Related stage files:** [07-stage-monetization.md](07-stage-monetization.md)

## 5. Pay-per-lead has no architecture.md phase

- **Citations:** product.md §31-32 ("Future Pay-Per-Lead", lead billing scenarios A-E), architecture.md §51 (26 phases, none implementing billable-lead logic)
- **Description:** Pay-per-lead is fully specified as a product concept (pricing by category/location/vendor plan, billing scenarios for spam/duplicate/disputed leads) but has zero corresponding engineering phase anywhere in the 26-phase architecture breakdown.
- **Impact:** When pay-per-lead is eventually prioritized, this docs set will need net-new Arch Phase(s) beyond the current 26 — there is no existing phase to slot it into.
- **Recommendation:** Carry as a forward-looking placeholder in Stage 7's Growth & Scale file, explicitly not a task checklist. Do not invent a speculative Arch Phase 26 now — define it when the feature is actually prioritized.
- **Status:** Open — deferred by design (Product Phase 9 "Advanced").
- **Related stage files:** [09-stage-growth-and-scale.md](09-stage-growth-and-scale.md)

## 6. Verification-level enum mismatch

- **Citations:** product.md §25 (`UNVERIFIED / IDENTITY_VERIFIED / BUSINESS_VERIFIED / PLATFORM_VERIFIED`), architecture.md §24 (`UNVERIFIED / BASIC_VERIFIED / IDENTITY_VERIFIED / BUSINESS_VERIFIED`)
- **Description:** The two source docs define genuinely different 4-level vendor verification hierarchies — different level names, different counts of shared levels. This is a direct enum mismatch, not a wording difference.
- **Impact:** Whichever enum is picked affects the vendor schema (Stage 1 admin/roles foundation touches this indirectly; Stage 2 Marketplace Supply implements the actual verification workflow) and any UI/badge copy built on top of it.
- **Recommendation:** Must be resolved as an explicit decision **before** Stage 2's vendor verification fields are implemented. Neither docs set should silently pick one — flag for stakeholder confirmation.
- **Status:** Open — needs a decision before Stage 2 implementation.
- **Related stage files:** [03-stage-foundation.md](03-stage-foundation.md), [04-stage-marketplace-supply.md](04-stage-marketplace-supply.md)

## 7. Notifications/Telegram co-design dependency

- **Citations:** product.md §22 (lists Telegram as a notification channel), product.md §33 (`MessagingProvider` abstraction), architecture.md §52 (dependency order: 11→12→13→14→15)
- **Description:** The stated dependency order has Notifications (14) complete before Telegram (15) starts. But product.md treats Telegram as one of Notifications' delivery channels, and Telegram's own `MessagingProvider` abstraction needs to align with Notifications' channel abstraction. Building them in strict, uncoordinated isolation risks a channel interface mismatch.
- **Impact:** Rework risk if Notifications' channel abstraction doesn't anticipate Telegram's needs.
- **Recommendation:** Not a hard conflict — but Stage 6's Open Questions must note that Notifications' channel abstraction and Telegram's `MessagingProvider` abstraction should be co-designed even though they are built sequentially.
- **Status:** Open — sequencing/coordination note, not a blocking conflict.
- **Related stage files:** [08-stage-telegram-and-admin.md](08-stage-telegram-and-admin.md)
