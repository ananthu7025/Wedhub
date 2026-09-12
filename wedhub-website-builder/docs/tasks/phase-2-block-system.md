# Phase 2 — Block System Core

**Status:** Not started
**Depends on:** Phase 1 (project scaffold, DB connection working)
**Docs:** [../architecture/02-data-model.md](../architecture/02-data-model.md), [../architecture/03-block-registry.md](../architecture/03-block-registry.md)

## Scope

- [ ] Full `prisma/schema.prisma` per [../architecture/02-data-model.md](../architecture/02-data-model.md): `Template`, `WebsiteContent` (defer `TemplateAsset`/`WebhookOutboxEvent` to Phases 4/6 if it simplifies sequencing, or include now since they're cheap to add) + enums. Run and commit the migration.
- [ ] `src/modules/templates/` — `template.schema.ts` (Zod validation for the full `content` JSON shape, including per-block-type `props` schemas), `.repository.ts`, `.service.ts`.
- [ ] `src/common/blocks/registry.ts` — the block registry mapping `type` → schema + editability tier, for the **standard, user-editable block types only** in this phase: `hero`, `story`, `events`, `venue`, `gallery`, `rsvp`, `countdown`, `contact_share`.
- [ ] `src/common/blocks/schemas/` — one Zod schema file per standard block type.
- [ ] Content validation service: given a `content` JSON, validate every section against the registry, reject unknown/malformed block types or props.
- [ ] Static (non-scrub) renderer components for each standard block type — `mode: "view" | "edit"` per [../architecture/03-block-registry.md](../architecture/03-block-registry.md)'s rendering contract. These can live in this service if it ever server-renders anything itself, or be handed off as a shared package/spec for `wedhub-frontend-app` to implement against — decide the exact code-location split during implementation (likely: schema/registry definitions here, React components in `wedhub-frontend-app`, sharing the JSON contract).
- [ ] Basic CRUD API for `Template` (no auth restriction yet beyond Phase 1's JWT check — role-gating to admin-only arrives in Phase 3).

## Explicit non-goals for this phase

- No `scrub_sequence` or `custom_html` block types yet (Phase 3/4).
- No admin-role gating yet (Phase 3).
- No gallery/fork/editing user-facing flow yet (Phase 5) — this phase is the data model and validation core only.

## Done criteria

- Can create a `Template` via the API with a `content` JSON exercising every standard block type, and it round-trips correctly (validated on write, returned unchanged on read).
- Malformed `content` (unknown block type, missing required props) is rejected with a clear validation error.
- Seed script (per [../backend/04-database-and-migrations.md](../backend/04-database-and-migrations.md)) produces at least 2-3 representative templates for later phases to build against.
