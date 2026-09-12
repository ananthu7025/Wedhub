# Phase 4 — Scroll-Scrub

**Status:** Not started
**Depends on:** Phase 3 (admin authoring, sanitization pipeline established)
**Docs:** [../architecture/04-scroll-scrub-rendering.md](../architecture/04-scroll-scrub-rendering.md), [../architecture/06-performance-and-fallbacks.md](../architecture/06-performance-and-fallbacks.md), [../backend/03-jobs-and-workers.md](../backend/03-jobs-and-workers.md)

**This is the highest-effort, highest-risk phase in the whole project. Budget real calendar time, especially for device/browser verification — this cannot be considered done from unit tests alone.**

## Scope

- [ ] `TemplateAsset` Prisma model (if not already added in Phase 2) + migration.
- [ ] `src/jobs/queues/frame-extraction.queue.ts` + `src/jobs/processors/frame-extraction.processor.ts` per [../backend/03-jobs-and-workers.md](../backend/03-jobs-and-workers.md): ffmpeg extraction, responsive WebP/AVIF encoding, R2 upload, poster frame generation, status transitions (`PROCESSING` → `READY`/`FAILED`).
- [ ] Frame-count and section-count cap enforcement (60-80 frames/section, 3-4 scrub sections/template) at **template-save time**, not just in the job — per [../architecture/06-performance-and-fallbacks.md](../architecture/06-performance-and-fallbacks.md).
- [ ] `scrub_sequence` block type added to the registry: schema (`heightVh`, `background.templateAssetId`, `background.frameRange`, `beats[]`), admin-only editability tier.
- [ ] `POST /admin/templates/:id/assets` + polling `GET .../assets/:assetId` endpoints.
- [ ] Frontend-facing contract (component spec, even if the actual component lives in `wedhub-frontend-app` per the Phase 2 code-location decision): the `ScrubSequenceSection` component per the sketch in [../architecture/04-scroll-scrub-rendering.md](../architecture/04-scroll-scrub-rendering.md) — sticky container, `useScroll`-driven progress, canvas frame painting, `Beat` components driven by the same progress value.
- [ ] `prefers-reduced-motion` fallback: static poster frame + stacked beat list.
- [ ] Slow-connection/`saveData` fallback: same static rendering path as the reduced-motion fallback.
- [ ] Admin-facing "beats" timeline authoring (even a minimal version — e.g. a form to add `{progressRange, content, enter, exit}` entries; a visual scrubber-timeline UI is a nice-to-have, not required for this phase's done criteria).

## Explicit non-goals for this phase

- No requirement to build a polished visual timeline-scrubbing UI for admins authoring `beats` — a functional form-based version is sufficient for v1.
- No requirement yet to wire this into the actual user-facing gallery/editor (Phase 5) — this phase proves the mechanism works end-to-end for one admin-authored template, viewable via a direct preview URL.

## Done criteria

- Uploading a real short test video via `POST /admin/templates/:id/assets` produces a `TemplateAsset` that transitions `PROCESSING` → `READY` with a correct `frameCount`, populated `frames`, and a valid `posterFrameKey`, all retrievable from R2.
- A template containing one `scrub_sequence` section with that asset renders correctly in a real browser: scrolling through the section's height smoothly scrubs the frame sequence, and at least two `beats` enter/exit at their configured progress ranges in sync with the frame playback.
- With `prefers-reduced-motion: reduce` simulated (browser dev tools), the same section renders as a static poster image with beats shown as a stacked list — no canvas painting, no scroll-driven motion.
- Manual verification on at least one real mobile device (or a throttled mobile emulation profile) confirms acceptable frame-rate/jank and confirms the slow-connection fallback triggers correctly under throttled network conditions.
