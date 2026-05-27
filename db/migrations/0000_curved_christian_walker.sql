CREATE TABLE "kb_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"kb_entry_id" text,
	"license_id" text,
	"cve_id" text NOT NULL,
	"analysis_hash" text NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"cve_id" text NOT NULL,
	"severity" text NOT NULL,
	"risk_summary" text NOT NULL,
	"business_impact" text,
	"mitigation_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_packages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" text,
	"source" text NOT NULL,
	"model_used" text,
	"confidence" text DEFAULT 'medium' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"curated_by_team" boolean DEFAULT false NOT NULL,
	"contribution_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_admins" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_licenses" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"license_key" text NOT NULL,
	"tier" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"max_users" integer,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	"revoke_reason" text,
	"last_validated_at" timestamp with time zone,
	"last_instance_id" text,
	"email_sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "kb_contributions" ADD CONSTRAINT "kb_contributions_kb_entry_id_kb_entries_id_fk" FOREIGN KEY ("kb_entry_id") REFERENCES "public"."kb_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_contributions" ADD CONSTRAINT "kb_contributions_license_id_portal_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."portal_licenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_licenses" ADD CONSTRAINT "portal_licenses_customer_id_portal_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."portal_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kb_contributions_analysis_hash_idx" ON "kb_contributions" USING btree ("analysis_hash");--> statement-breakpoint
CREATE INDEX "kb_contributions_cve_idx" ON "kb_contributions" USING btree ("cve_id");--> statement-breakpoint
CREATE INDEX "kb_contributions_license_idx" ON "kb_contributions" USING btree ("license_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kb_entries_cve_idx" ON "kb_entries" USING btree ("cve_id");--> statement-breakpoint
CREATE INDEX "kb_entries_severity_idx" ON "kb_entries" USING btree ("severity");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_admins_email_idx" ON "portal_admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "portal_audit_log_action_idx" ON "portal_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "portal_audit_log_actor_idx" ON "portal_audit_log" USING btree ("actor");--> statement-breakpoint
CREATE INDEX "portal_audit_log_created_at_idx" ON "portal_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_customers_email_idx" ON "portal_customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "portal_customers_status_idx" ON "portal_customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "portal_licenses_customer_idx" ON "portal_licenses" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_licenses_license_key_idx" ON "portal_licenses" USING btree ("license_key");--> statement-breakpoint
CREATE INDEX "portal_licenses_status_idx" ON "portal_licenses" USING btree ("status");