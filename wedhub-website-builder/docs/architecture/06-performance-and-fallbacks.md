# Performance and Fallbacks

Scroll-scrub sections (see [04-scroll-scrub-rendering.md](04-scroll-scrub-rendering.md)) are the single biggest performance risk in this system — an uncapped "100s of 4K frames" background will wreck mobile Core Web Vitals and data usage. These guardrails are **hard limits enforced at template-save time**, not just guidance for template authors.

## Hard limits (validated server-side when an admin saves/publishes a `Template`)

| Limit | Value | Enforced by |
|---|---|---|
| Frames per `scrub_sequence` section | 60–80 | `template.schema.ts` validation on save; job also refuses to extract more than the cap |
| `scrub_sequence` sections per template | 3–4 max | Same validation pass, counts section types in `content.sections` |
| Frame image weight per breakpoint tier | Aggressively compressed WebP/AVIF, sized per responsive tier (not one oversized asset serving all breakpoints) | Frame-extraction job (see [backend/03-jobs-and-workers.md](../backend/03-jobs-and-workers.md)) |

If an admin's uploaded video would produce more frames than the cap at the configured extraction cadence, the job either downsamples the extraction rate to fit the cap or fails with a clear `failureReason` on `TemplateAsset` — never silently ships an oversized sequence.

## Loading strategy

- **Only preload the frame sequence for the scrub section nearest the viewport** (current + next) — not the whole page's assets upfront. Earlier sections' frame data is released from memory once scrolled past.
- Each scrub section's **poster frame** (`TemplateAsset.posterFrameKey`) doubles as the section's LCP image — first paint is never blocked on the full sequence loading, matching the existing `Media.blurDataUrl` perceived-speed pattern already used elsewhere in WedHub (see project memory: image perf optimization).
- Standard (non-scrub) blocks load through the existing Media/R2 pipeline conventions already established in `wedhub-backend` — no new image pipeline invented for those.

## Accessibility and reduced-motion fallback

- `prefers-reduced-motion: reduce` — scrub sections render their `posterFrameKey` as a static image, with `beats[].content` rendered as a simple stacked static list (no scroll-driven motion, no canvas painting). Same content, zero motion cost.
- This is a **rendering-mode switch**, not a degraded experience users have to opt out of manually — it's automatic based on the media query.

## Low-power / slow-connection fallback

- Check `navigator.connection?.saveData` and `navigator.connection?.effectiveType` (where supported) at mount time.
- On `saveData: true` or `effectiveType` in `{"slow-2g", "2g"}`, scrub sections auto-downgrade to the same static poster-frame + stacked-beats rendering used for reduced-motion — never attempt to preload a full frame sequence on a connection that can't afford it.
- This fallback must degrade gracefully, not break: the section is still fully readable and on-brand, just without the scrub interaction.

## Verification requirement (not just unit tests)

Per the task plan's Phase 4 and Phase 6 verification sections, scroll-scrub rendering must be manually verified in a real browser on a real (or throttled) mobile device — frame sync correctness, `prefers-reduced-motion` fallback, and slow-connection fallback are all things unit tests cannot meaningfully cover. A Lighthouse/Core Web Vitals pass against a real scrub-heavy template page on a throttled mobile profile is required before rollout (see [tasks/phase-6-integration-and-launch.md](../tasks/phase-6-integration-and-launch.md)).
