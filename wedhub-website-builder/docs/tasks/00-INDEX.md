# Task Phases

Execute in order — each phase depends on the previous one's data model/scaffolding existing. Update the Status column as work progresses; this is the single place to check "where are we" on this project.

| Phase | File | Covers | Status |
|---|---|---|---|
| 1 | [phase-1-foundation.md](phase-1-foundation.md) | Project scaffold, own DB/Redis, auth verification, deploy wiring | Not started |
| 2 | [phase-2-block-system.md](phase-2-block-system.md) | Template/content data model, standard block registry, static rendering | Not started |
| 3 | [phase-3-admin-authoring.md](phase-3-admin-authoring.md) | Admin template CRUD, custom_html escape hatch, thumbnails | Not started |
| 4 | [phase-4-scroll-scrub.md](phase-4-scroll-scrub.md) | TemplateAsset, ffmpeg pipeline, scroll-scrub renderer, beats | Not started |
| 5 | [phase-5-gallery-and-user-editing.md](phase-5-gallery-and-user-editing.md) | Public gallery, fork-to-user-content, prop editor | Not started |
| 6 | [phase-6-integration-and-launch.md](phase-6-integration-and-launch.md) | Webhook sync, payment-gated publish, perf validation, rollout | Not started |

## Sequencing notes

- Phases 2–3 can be built and demoed entirely with **static** block types (no scroll-scrub) — this is a deliberate checkpoint to validate the core data model and editor UX before taking on the highest-risk piece (Phase 4).
- Phase 4 (scroll-scrub) is the highest-effort, highest-risk phase — budget real calendar time for the ffmpeg pipeline and cross-browser/device verification, not just the component code.
- Phase 6 is the only phase that touches `wedhub-backend` at all (the mirror-column migration and webhook receiver) — every earlier phase is fully self-contained within `wedhub-website-builder`.
- Telegram is out of scope in every phase, permanently — see `../architecture/01-overview.md`.
