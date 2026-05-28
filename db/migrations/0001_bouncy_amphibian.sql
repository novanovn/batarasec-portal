ALTER TABLE "portal_licenses" ALTER COLUMN "status" SET DEFAULT 'issued';

-- NOTE: drizzle-kit migrate does not execute DML statements below.
-- Run manually after migration:
--   UPDATE portal_licenses SET status = 'active' WHERE last_validated_at IS NOT NULL AND status = 'active';
--   UPDATE portal_licenses SET status = 'issued' WHERE last_validated_at IS NULL AND status = 'active';
-- Production backfill was applied manually on 2026-05-28.