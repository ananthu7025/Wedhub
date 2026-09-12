# Data Model

This service has its own Postgres database — fully separate from `wedhub-backend`'s. No shared schema, no shared connection pool. See [01-overview.md](01-overview.md) for why.

## Prisma models

```prisma
enum TemplateStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum TemplateAssetKind {
  FRAME_SEQUENCE
  VIDEO_LOOP
  IMAGE
}

enum AssetStatus {
  PROCESSING
  READY
  FAILED
}

enum ContentStatus {
  DRAFT
  PUBLISHED
}

model Template {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name            String
  slug            String         @unique
  collection      String         // e.g. "royal", "classic" — matches gallery filter groups
  category        String?
  status          TemplateStatus @default(DRAFT)
  thumbnailKey    String?
  content         Json           // { theme: {...}, sections: [...] } — see "Content shape" below
  createdByUserId String         @db.Uuid  // opaque JWT subject, NOT a local FK — no User table here
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  assets TemplateAsset[]

  @@index([status, collection])
  @@map("templates")
}

model TemplateAsset {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  templateId      String            @db.Uuid
  sectionRef      String            // section.id within Template.content this asset belongs to
  kind            TemplateAssetKind
  sourceObjectKey String            // original admin-uploaded video, in R2
  frames          Json?             // ordered [{ key, width }] per breakpoint tier, for FRAME_SEQUENCE
  posterFrameKey  String?           // first-frame image, doubles as LCP image
  frameCount      Int?
  status          AssetStatus       @default(PROCESSING)
  failureReason   String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@index([templateId])
  @@map("template_assets")
}

model WebsiteContent {
  id               String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerUserId      String         @db.Uuid  // opaque JWT subject, NOT a local FK
  weddingWebsiteId String         @unique @db.Uuid // pointer back to wedhub-backend's WeddingWebsite.id
  templateId       String?        @db.Uuid  // which Template this was forked from (nullable: template may be deleted/archived later)
  content          Json           // user's own edited copy of theme+sections
  status           ContentStatus  @default(DRAFT)
  publicSlug       String?        @unique
  publishedAt      DateTime?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@index([ownerUserId])
  @@index([status])
  @@map("website_contents")
}

// Idempotent outbound event log — mirrors wedhub-backend's WebhookEvent pattern
// (wedhub-backend/src/modules/webhooks/) so a retried delivery never double-fires
// the mirror update on wedhub-backend's WeddingWebsite row.
model WebhookOutboxEvent {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  eventType        String    // e.g. "website_content.published", "website_content.updated"
  weddingWebsiteId String    @db.Uuid
  payload          Json
  deliveredAt      DateTime?
  attempts         Int       @default(0)
  lastError        String?
  createdAt        DateTime  @default(now())

  @@index([deliveredAt])
  @@map("webhook_outbox_events")
}
```

### Why `ownerUserId`/`createdByUserId` are not foreign keys

This service deliberately has no `User` table. Every user-identifying field is an opaque UUID copied out of the verified JWT issued by `wedhub-backend`. This is the concrete expression of "own database, no shared schema" — see [05-integration-with-wedhub-backend.md](05-integration-with-wedhub-backend.md) for the auth verification flow.

## Content shape (the `Json` payload in `Template.content` / `WebsiteContent.content`)

```jsonc
{
  "theme": { "primaryColor": "#7a1f2b", "font": "playfair", "mode": "cinematic" },
  "sections": [
    {
      "id": "s1",
      "type": "hero",
      "props": { "headline": "...", "coverMediaId": "..." },
      "animation": { "preset": "fade-up" }
    },
    {
      "id": "s2",
      "type": "scrub_sequence",
      "heightVh": 400,
      "background": {
        "templateAssetId": "ta_1",
        "frameRange": { "start": 0, "end": 79 }
      },
      "beats": [
        {
          "id": "b1",
          "progressRange": [0, 0.2],
          "content": { "type": "headline", "text": "{{coupleNames}}" },
          "enter": "fade-up",
          "exit": "fade-out"
        },
        {
          "id": "b2",
          "progressRange": [0.35, 0.55],
          "content": { "type": "caption", "text": "{{weddingDateLabel}}" }
        }
      ]
    },
    { "id": "s3", "type": "gallery", "props": { "mediaIds": ["..."], "columns": 3 } },
    { "id": "s4", "type": "custom_html", "props": { "html": "<div>...</div>", "animationComponent": "RoseGoldReveal" } }
  ]
}
```

See [03-block-registry.md](03-block-registry.md) for the full list of section `type`s and which are end-user editable vs. admin-only, and [04-scroll-scrub-rendering.md](04-scroll-scrub-rendering.md) for how `scrub_sequence` + `beats` are rendered.

`{{token}}` interpolation (e.g. `{{coupleNames}}`, `{{weddingDateLabel}}`) resolves against the website's own known data fields — the same values today's `WeddingWebsiteRenderer.tsx` computes inline, just relocated into data instead of hardcoded JSX.

## Template → WebsiteContent relationship

- `Template` rows are the browsable catalog (what shows in the gallery).
- Picking "Use this design" **forks** `Template.content` into a new `WebsiteContent.content` row, owned by the user. This is a deliberate fork, not a live reference — editing a `WebsiteContent` never mutates the `Template` it came from, and a `Template` being updated/archived later never silently changes a user's already-forked site.
- `WebsiteContent.templateId` is kept only as a soft provenance pointer (analytics, "what template did this start from"), not a live dependency.
