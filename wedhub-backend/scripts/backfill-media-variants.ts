/**
 * One-off backfill for Media rows created before the resize pipeline
 * existed (or whose async processing job failed/never ran) — anything with
 * a required `originalObjectKey` but a null `optimizedObjectKey` and/or
 * `thumbnailObjectKey`. Those rows currently force every card/grid/list
 * surface that reads `thumbnailObjectKey ?? optimizedObjectKey ??
 * originalObjectKey` to fall through to the full original file, which is
 * exactly the "downloading multi-megabyte originals for a small UI tile"
 * problem this whole performance pass targets. `blurDataUrl` is backfilled
 * too when missing, independently of whether the size variants were
 * already present — so a row that has thumbnail/medium but no blur (an
 * even earlier pipeline generation, before blurDataUrl existed) still gets
 * fixed.
 *
 * Reuses generateMediaVariants() from
 * src/jobs/processors/media-variant-generator.ts — the exact same
 * resize/quality/keying logic the live upload pipeline uses, so a
 * backfilled row is indistinguishable from one processed at upload time.
 *
 * SAFE BY DEFAULT: dry-run unless --apply is passed. Never deletes or
 * overwrites originalObjectKey; only ever fills in currently-null
 * optimizedObjectKey/thumbnailObjectKey/blurDataUrl columns, and is
 * idempotent — a row that already has all three (unless --force) is
 * skipped, so re-running after a partial/interrupted run or on a schedule
 * is safe.
 *
 * Usage (from wedhub-backend/):
 *   npx tsx --env-file=.env scripts/backfill-media-variants.ts                # dry run, all media types
 *   npx tsx --env-file=.env scripts/backfill-media-variants.ts --apply         # actually write variants + DB updates
 *   npx tsx --env-file=.env scripts/backfill-media-variants.ts --apply --limit=50
 *   npx tsx --env-file=.env scripts/backfill-media-variants.ts --apply --concurrency=5
 *   npx tsx --env-file=.env scripts/backfill-media-variants.ts --apply --media-id=<uuid>   # single row, for retrying a known failure
 *   npx tsx --env-file=.env scripts/backfill-media-variants.ts --apply --force  # also regenerate rows that already have variants (re-encode with current quality settings)
 */
import { prisma } from "../src/config/database";
import { logger } from "../src/config/logger";
import { objectExists } from "../src/integrations/storage/r2.client";
import { generateMediaVariants } from "../src/jobs/processors/media-variant-generator";

interface CliOptions {
  apply: boolean;
  force: boolean;
  limit: number | undefined;
  concurrency: number;
  mediaId: string | undefined;
}

function parseArgs(argv: string[]): CliOptions {
  const flags = new Set(argv);
  const getValue = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const match = argv.find((a) => a.startsWith(prefix));
    return match?.slice(prefix.length);
  };

  const limitRaw = getValue("limit");
  const concurrencyRaw = getValue("concurrency");

  return {
    apply: flags.has("--apply"),
    force: flags.has("--force"),
    limit: limitRaw ? Number(limitRaw) : undefined,
    concurrency: concurrencyRaw ? Number(concurrencyRaw) : 3,
    mediaId: getValue("media-id"),
  };
}

interface BackfillResult {
  mediaId: string;
  outcome: "updated" | "skipped-already-complete" | "skipped-original-missing" | "failed" | "would-update";
  error?: string;
}

/**
 * Bounded-concurrency map — runs `worker` over `items` with at most `limit`
 * in flight at once, rather than either fully sequential (slow: this is a
 * network-bound Sharp download/upload per item) or Promise.all (unbounded:
 * could open hundreds of simultaneous R2 connections and Sharp buffers for
 * a large backlog). No external dependency (e.g. p-limit) needed for
 * something this small.
 */
async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    const currentIndex = nextIndex++;
    if (currentIndex >= items.length) return;
    results[currentIndex] = await worker(items[currentIndex] as T, currentIndex);
    await runNext();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

async function backfillOne(
  media: { id: string; originalObjectKey: string; optimizedObjectKey: string | null; thumbnailObjectKey: string | null; blurDataUrl: string | null },
  options: CliOptions,
): Promise<BackfillResult> {
  const needsVariants = options.force || !media.optimizedObjectKey || !media.thumbnailObjectKey || !media.blurDataUrl;
  if (!needsVariants) {
    return { mediaId: media.id, outcome: "skipped-already-complete" };
  }

  // Guard against a Media row whose originalObjectKey was already deleted
  // from R2 (e.g. a partially-cleaned-up failed upload) — downloadObject
  // would throw anyway, but this gives a clearer, categorized skip reason
  // in the summary instead of lumping it in with genuine processing
  // failures, and avoids spending a Sharp decode attempt on a 404.
  const exists = await objectExists(media.originalObjectKey);
  if (!exists) {
    logger.warn({ mediaId: media.id, originalObjectKey: media.originalObjectKey }, "Backfill: original object missing in R2, skipping");
    return { mediaId: media.id, outcome: "skipped-original-missing" };
  }

  if (!options.apply) {
    return { mediaId: media.id, outcome: "would-update" };
  }

  try {
    const variants = await generateMediaVariants(media.originalObjectKey);
    await prisma.media.update({
      where: { id: media.id },
      data: {
        optimizedObjectKey: variants.optimizedObjectKey,
        thumbnailObjectKey: variants.thumbnailObjectKey,
        blurDataUrl: variants.blurDataUrl,
        ...(variants.width !== undefined ? { width: variants.width } : {}),
        ...(variants.height !== undefined ? { height: variants.height } : {}),
      },
    });
    logger.info({ mediaId: media.id }, "Backfill: media variants generated");
    return { mediaId: media.id, outcome: "updated" };
  } catch (err) {
    // Continue-after-individual-failure is the whole point of this script —
    // one corrupt/unreadable original must never abort the run for every
    // other row. status is deliberately left untouched (unlike the live
    // worker's FAILED transition on error) since these rows are already
    // READY/serving via their original — a backfill failure shouldn't
    // regress a currently-working (if suboptimal) image.
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, mediaId: media.id }, "Backfill: failed to generate media variants");
    return { mediaId: media.id, outcome: "failed", error: message };
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  logger.info(
    { apply: options.apply, force: options.force, limit: options.limit, concurrency: options.concurrency, mediaId: options.mediaId },
    "Media variant backfill starting",
  );
  if (!options.apply) {
    logger.info("DRY RUN — no R2 uploads or DB writes will happen. Pass --apply to actually run the backfill.");
  }

  const where = options.mediaId
    ? { id: options.mediaId }
    : options.force
      ? {}
      : {
          OR: [{ optimizedObjectKey: null }, { thumbnailObjectKey: null }, { blurDataUrl: null }],
        };

  const candidates = await prisma.media.findMany({
    where,
    select: { id: true, originalObjectKey: true, optimizedObjectKey: true, thumbnailObjectKey: true, blurDataUrl: true },
    orderBy: { createdAt: "asc" },
    ...(options.limit ? { take: options.limit } : {}),
  });

  logger.info({ count: candidates.length }, "Media variant backfill: candidates found");
  if (candidates.length === 0) {
    logger.info("Nothing to backfill.");
    return;
  }

  const results = await mapWithConcurrency(candidates, options.concurrency, (media) => backfillOne(media, options));

  const summary = {
    total: results.length,
    updated: results.filter((r) => r.outcome === "updated").length,
    wouldUpdate: results.filter((r) => r.outcome === "would-update").length,
    skippedAlreadyComplete: results.filter((r) => r.outcome === "skipped-already-complete").length,
    skippedOriginalMissing: results.filter((r) => r.outcome === "skipped-original-missing").length,
    failed: results.filter((r) => r.outcome === "failed").length,
  };
  logger.info(summary, "Media variant backfill complete");

  const failures = results.filter((r) => r.outcome === "failed");
  if (failures.length > 0) {
    logger.warn(
      { failedMediaIds: failures.map((f) => f.mediaId) },
      "Some media failed to backfill — safe to re-run this script (idempotent) after investigating, or retry individually with --media-id",
    );
  }
}

main()
  .catch((err) => {
    logger.error({ err }, "Media variant backfill crashed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
