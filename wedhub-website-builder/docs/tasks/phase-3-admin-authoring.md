# Phase 3 — Admin Authoring

**Status:** Not started
**Depends on:** Phase 2 (Template model, block registry, validation)
**Docs:** [../architecture/03-block-registry.md](../architecture/03-block-registry.md), [../backend/02-api-reference.md](../backend/02-api-reference.md)

## Scope

- [ ] Admin-role gating middleware (checks the role claim on the already-verified JWT from Phase 1) applied to `/admin/*` routes.
- [ ] `custom_html` block type added to the registry: schema (`html: string`, `animationComponent?: string`), **admin-only** editability tier.
- [ ] Server-side HTML sanitization (DOMPurify or `rehype-sanitize`) applied to `custom_html.props.html` at save time — before it's persisted, not at render time — per [../architecture/03-block-registry.md](../architecture/03-block-registry.md)'s security boundary section.
- [ ] Named animation component registry (starting set, e.g. `RoseGoldReveal`) — a small, explicitly-documented list admins can reference by name from a `custom_html` block; document how to add a new one (this registry is expected to grow over time as new showcase templates are authored).
- [ ] `POST /admin/templates`, `PATCH /admin/templates/:id`, `POST /admin/templates/:id/publish` endpoints.
- [ ] Thumbnail upload for `Template.thumbnailKey` — reuse the R2 upload pattern (see [../backend/01-project-setup.md](../backend/01-project-setup.md)), scoped to a `templates/{templateId}/thumbnail` key prefix.
- [ ] Enforcement (at the API layer, not just documentation) that `PATCH /website-content/:id` (the future end-user editing endpoint, stubbed or real depending on Phase 5 sequencing) rejects any section with `type: "custom_html"` or `type: "scrub_sequence"` in its request body.

## Explicit non-goals for this phase

- No `scrub_sequence` block type yet (Phase 4 — this phase covers the `custom_html` escape hatch only).
- No admin authoring **UI** decision finalized yet — whether this lives in `wedhub-frontend-app`'s `(admin)` route group or as a lighter internal tool is tracked as an open question in [../risks-and-open-questions.md](../risks-and-open-questions.md); this phase's scope is the API, not necessarily a polished UI.

## Done criteria

- An admin (valid JWT + admin role claim) can create a template containing a `custom_html` section with a deliberately "dirty" HTML string (e.g. containing a `<script>` tag) and confirm the persisted/returned content has it stripped.
- A non-admin JWT is rejected with 403 on every `/admin/*` route.
- A simulated end-user `PATCH /website-content/:id` request containing a `custom_html` or `scrub_sequence` section edit is rejected (this can be a test against a stub/mock of the Phase 5 endpoint if Phase 5 isn't built yet — the validation rule itself belongs in the shared content-validation service from Phase 2, so it can be tested independently of the full endpoint).
