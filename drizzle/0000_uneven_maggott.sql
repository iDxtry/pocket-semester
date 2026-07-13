CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"month" date NOT NULL,
	"category" text NOT NULL,
	"limit_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"month" date NOT NULL,
	"plan" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'emergency' NOT NULL,
	"target_cents" integer NOT NULL,
	"current_cents" integer DEFAULT 0 NOT NULL,
	"target_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"merchant_key" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"semester_start" date,
	"semester_end" date,
	"monthly_allowance_cents" integer DEFAULT 0 NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"merchant" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"amount_cents" integer NOT NULL,
	"occurred_on" date NOT NULL,
	"category" text NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_month_category_idx" ON "budgets" USING btree ("user_id","month","category");--> statement-breakpoint
CREATE INDEX "budgets_user_month_idx" ON "budgets" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "coach_runs_user_month_idx" ON "coach_runs" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_rules_user_merchant_idx" ON "merchant_rules" USING btree ("user_id","merchant_key");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_clerk_user_id_idx" ON "profiles" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","occurred_on");