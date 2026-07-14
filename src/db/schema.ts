import { index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid, date, boolean } from "drizzle-orm/pg-core";
import type { Category } from "@/lib/budget";
import type { CoachPlan } from "@/lib/ai/types";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    displayName: text("display_name").notNull(),
    currency: text("currency").notNull().default("USD"),
    semesterStart: date("semester_start", { mode: "string" }),
    semesterEnd: date("semester_end", { mode: "string" }),
    monthlyAllowanceCents: integer("monthly_allowance_cents").notNull().default(0),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profiles_user_id_idx").on(table.userId)],
);

export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("auth_users_email_idx").on(table.email)],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("auth_sessions_user_idx").on(table.userId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    merchant: text("merchant").notNull(),
    description: text("description").notNull().default(""),
    amountCents: integer("amount_cents").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    category: text("category").$type<Category>().notNull(),
    confidence: real("confidence").notNull().default(0),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("transactions_user_date_idx").on(table.userId, table.occurredOn)],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    month: date("month", { mode: "string" }).notNull(),
    category: text("category").$type<Category>().notNull(),
    limitCents: integer("limit_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("budgets_user_month_category_idx").on(table.userId, table.month, table.category),
    index("budgets_user_month_idx").on(table.userId, table.month),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("emergency"),
    targetCents: integer("target_cents").notNull(),
    currentCents: integer("current_cents").notNull().default(0),
    targetDate: date("target_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("goals_user_idx").on(table.userId)],
);

export const merchantRules = pgTable(
  "merchant_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    merchantKey: text("merchant_key").notNull(),
    category: text("category").$type<Category>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("merchant_rules_user_merchant_idx").on(table.userId, table.merchantKey)],
);

export const coachRuns = pgTable(
  "coach_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    month: date("month", { mode: "string" }).notNull(),
    plan: jsonb("plan").$type<CoachPlan>().notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("coach_runs_user_month_idx").on(table.userId, table.month)],
);
