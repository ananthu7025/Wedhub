# Jobs and Workers

Mirrors `wedhub-backend/src/jobs/`'s shape: BullMQ + ioredis, `queues/<name>.queue.ts` (lazy-singleton `Queue`, typed job-data interface, `enqueueX()` helper), `processors/<name>.processor.ts` (the `Worker`), booted from a dedicated `worker.ts` entrypoint run as its own PM2 process (`wedhub-microsite-worker`).

## `frame-extraction` queue/processor

The core pipeline behind `scrub_sequence` sections (see [../architecture/04-scroll-scrub-rendering.md](../architecture/04-scroll-scrub-rendering.md)).

**Trigger:** `POST /admin/templates/:id/assets` (admin uploads a video for a given section) creates a `TemplateAsset` row with `status: PROCESSING` and enqueues a job.

**Job payload:**
```ts
interface FrameExtractionJobData {
  templateAssetId: string;
  sourceObjectKey: string; // admin's uploaded video, already in R2
}
```

**Processor steps:**
1. Download the source video from R2 to a temp working directory.
2. Run ffmpeg to extract frames at a cadence chosen to land within the frame-count cap (60–80 frames — see [../architecture/06-performance-and-fallbacks.md](../architecture/06-performance-and-fallbacks.md)). If the source video's natural frame count at a reasonable cadence would exceed the cap, downsample the extraction rate rather than truncating — never silently drop the tail of the sequence.
3. Encode each extracted frame as WebP/AVIF at 2–3 responsive width tiers (e.g. mobile/tablet/desktop).
4. Upload all frame variants to R2 under `templates/{templateId}/scrub/{sectionId}/{frameIndex}-{width}.webp`, reusing the existing `r2.client.ts` signed-upload pattern (adapted from `wedhub-backend/src/integrations/storage/r2.client.ts`).
5. Generate and upload a poster frame (first frame, or a designated "best" frame) — this doubles as the section's LCP image.
6. On success: update `TemplateAsset` — `status: READY`, `frames`, `frameCount`, `posterFrameKey`.
7. On failure (ffmpeg error, cap violation that can't be resolved by downsampling, upload failure): `status: FAILED`, `failureReason` set to a human-readable cause — never leave a row stuck in `PROCESSING` indefinitely; failures must be terminal and visible to the admin authoring UI.
8. Clean up the temp working directory in a `finally` block regardless of outcome.

**Idempotency/retry:** standard BullMQ `attempts`/`backoff` (matching `wedhub-backend`'s existing `enqueueX()` helper convention). Re-running the job for the same `templateAssetId` must be safe — overwrite the same R2 keys rather than accumulating orphaned assets from prior attempts.

**Runtime dependency:** `ffmpeg` must be installed in both the local dev environment and the Docker `runtime` stage — call this out explicitly in the Dockerfile, since `wedhub-backend`'s existing Dockerfile has no equivalent need and this is easy to miss when copying that file as a starting point.

## `schedules/`

Reserved, empty for v1 — mirrors `wedhub-backend/src/jobs/schedules/`'s current (also empty) state. No cron-style jobs are needed yet; if a future need arises (e.g. periodic cleanup of orphaned `TemplateAsset` rows from abandoned admin uploads), it goes here.
