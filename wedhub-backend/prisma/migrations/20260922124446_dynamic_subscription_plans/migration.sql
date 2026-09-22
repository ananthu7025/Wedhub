-- Dynamic plans & feature registry migration.
-- Production ("wedhub_prod") is live per server.md — this migration is written to be
-- additive/backward-compatible against non-empty subscription_plans/subscriptions/payments
-- tables, in the exact safe order documented in
-- PLAN-2026-09-22-dynamic-plans-and-feature-registry.md §9. Do not reorder these steps.

-- Step 1a: add slug as NULLABLE first — a NOT NULL UNIQUE column cannot be added in the
-- same statement that must populate existing rows.
ALTER TABLE "subscription_plans" ADD COLUMN "slug" TEXT;

-- Step 1b: backfill slugs for the 5 existing seeded rows by tier+interval, deterministically.
-- Any plan created by an admin after this migration always supplies its own slug (enforced by
-- the application layer's Zod schema), so this UPDATE only ever needs to cover pre-migration rows.
UPDATE "subscription_plans" SET "slug" = 'free' WHERE "tier" = 'FREE' AND "billing_interval" = 'MONTHLY';
UPDATE "subscription_plans" SET "slug" = 'pro' WHERE "tier" = 'PRO' AND "billing_interval" = 'MONTHLY';
UPDATE "subscription_plans" SET "slug" = 'pro-yearly' WHERE "tier" = 'PRO' AND "billing_interval" = 'YEARLY';
UPDATE "subscription_plans" SET "slug" = 'premium' WHERE "tier" = 'PREMIUM' AND "billing_interval" = 'MONTHLY';
UPDATE "subscription_plans" SET "slug" = 'premium-yearly' WHERE "tier" = 'PREMIUM' AND "billing_interval" = 'YEARLY';
-- Fallback for any row that somehow doesn't match the 5 known combinations above (defensive —
-- keeps this migration safe even if seed data has drifted from what this repo's seed.ts expects).
UPDATE "subscription_plans" SET "slug" = 'plan-' || "id"::text WHERE "slug" IS NULL;

-- Step 1c: now safe to enforce NOT NULL + UNIQUE, since every row has a value.
ALTER TABLE "subscription_plans" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- Step 2: additive columns, safe as single-step defaults.
ALTER TABLE "subscription_plans" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscription_plans" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Step 3: one-time bridge from the old implicit-FREE convention to the new explicit flag.
-- This is the last statement in this migration allowed to reference "tier" meaningfully —
-- after this, application code never branches on tier again.
UPDATE "subscription_plans" SET "is_default" = true
  WHERE "tier" = 'FREE' AND "billing_interval" = 'MONTHLY';

-- Step 3b: defensive fallback — if no FREE/MONTHLY row exists in some environment, default to
-- whichever active plan is cheapest, so getEffectivePlan() always has exactly one default to read.
-- (No-op in any environment where step 3 already set exactly one row.)
UPDATE "subscription_plans" SET "is_default" = true
  WHERE "id" = (
    SELECT "id" FROM "subscription_plans"
    WHERE "is_active" = true
    ORDER BY "price" ASC, "created_at" ASC
    LIMIT 1
  )
  AND NOT EXISTS (SELECT 1 FROM "subscription_plans" WHERE "is_default" = true);

-- Step 4: enforce "exactly one default plan" at the DB level — a partial unique index, since
-- Postgres has no native "unique where true" column constraint syntax otherwise.
CREATE UNIQUE INDEX "subscription_plans_one_default_idx"
  ON "subscription_plans" ("is_default") WHERE "is_default" = true;

-- Step 5: remove the fixed-tier constraint (the actual unlock — multiple plans can now share a
-- billing interval, or any former tier value, freely) and make tier nullable/cosmetic-only.
-- The enum type itself and the tier column are intentionally NOT dropped in this migration —
-- nullable-and-unused is safe and reversible; dropping the column/type is a separate follow-up
-- once this has run in production for a while with no issues.
DROP INDEX IF EXISTS "subscription_plans_tier_billing_interval_key";
ALTER TABLE "subscription_plans" ALTER COLUMN "tier" DROP NOT NULL;

-- Step 6: display ordering for existing rows, so the new sortOrder-driven admin/vendor list
-- renders in a sane price order immediately after migration instead of all-zero/arbitrary order.
UPDATE "subscription_plans" SET "sort_order" = sub.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "price" ASC) AS rn
  FROM "subscription_plans"
) sub
WHERE "subscription_plans"."id" = sub."id";

-- Index to support the new admin/vendor list ordering (isActive, sortOrder).
CREATE INDEX "subscription_plans_is_active_sort_order_idx"
  ON "subscription_plans" ("is_active", "sort_order");
