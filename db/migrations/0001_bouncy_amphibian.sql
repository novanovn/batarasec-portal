ALTER TABLE "portal_licenses" ALTER COLUMN "status" SET DEFAULT 'issued';
--> statement-breakpoint
UPDATE "portal_licenses" SET "status" = 'active' WHERE "status" = 'active' AND "last_validated_at" IS NOT NULL;
--> statement-breakpoint
UPDATE "portal_licenses" SET "status" = 'issued' WHERE "status" = 'active' AND "last_validated_at" IS NULL;