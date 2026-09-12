# Database and Migrations

## Schema

Full model definitions in [../architecture/02-data-model.md](../architecture/02-data-model.md): `Template`, `TemplateAsset`, `WebsiteContent`, `WebhookOutboxEvent`, plus the `TemplateStatus`/`TemplateAssetKind`/`AssetStatus`/`ContentStatus` enums.

## Migration workflow

Identical to `wedhub-backend`'s:

```
npm run db:migrate    # prisma migrate dev (local) — creates a new prisma/migrations/<timestamp>_<name>/ folder
npm run db:seed       # seed script for local/dev sample templates
npm run db:reset       # prisma migrate reset (destructive, local/dev only)
```

Production deploys run `prisma migrate deploy` (not `migrate dev`) as part of `scripts/deploy.sh`'s block for this service — see [01-project-setup.md](01-project-setup.md).

## Isolation reminder

This is a **separate Prisma schema and client** from `wedhub-backend/prisma/schema.prisma` — do not attempt to reference `wedhub-backend`'s models from this schema (e.g. no Prisma relation from `WebsiteContent` to a `User` or `WeddingWebsite` model). Cross-service references are plain UUID columns (`ownerUserId`, `weddingWebsiteId`) with no foreign-key constraint, validated at the application layer against the verified JWT / the webhook payload, not at the database layer. See [../architecture/02-data-model.md](../architecture/02-data-model.md)'s "Why `ownerUserId`/`createdByUserId` are not foreign keys" section.

## Seed data

The local seed script should include a handful of representative `Template` rows exercising each block type (including at least one `scrub_sequence` example with a short placeholder frame sequence and one `custom_html` example) so Phase 2/3 development and the editor UI can be built against realistic data before real admin-authored templates exist.

## Migrating the existing 3 enum templates (Phase 6)

`wedhub-backend`'s existing `ROYAL_WEDDING` / `MINIMAL_ELEGANT` / `TRADITIONAL_INDIAN` templates should eventually be re-expressed as `Template` rows in this service's database (translating today's `theme.ts` tokens and `WeddingWebsiteRenderer.tsx`'s fixed section order into equivalent `content` JSON), so old and new templates flow through the same catalog going forward. This is explicitly a Phase 6 task, not a blocker for earlier phases — the old enum-based path keeps working untouched until this migration happens.
