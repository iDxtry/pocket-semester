import { z } from "zod";
import { categories } from "@/lib/budget";
import { isValidIsoDate, isValidMonth } from "@/lib/budget-math";

export const categorySchema = z.enum(categories);

export const signInSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(128),
});

export const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(1).max(80),
});

const isoDateSchema = z.string().refine(isValidIsoDate, "Use a real YYYY-MM-DD calendar date.");
const monthSchema = z.string().refine(isValidMonth, "Use a valid YYYY-MM month.");

export const expenseAnalysisRequestSchema = z.object({
  merchant: z.string().trim().min(1).max(80),
  description: z.string().trim().max(180).default(""),
  amountCents: z.number().int().positive().max(10_000_000),
  occurredOn: isoDateSchema.optional(),
  monthlySpentCents: z.number().int().nonnegative().max(100_000_000),
  monthlyBudgetCents: z.number().int().positive().max(100_000_000),
});

export const createTransactionSchema = z.object({
  merchant: z.string().trim().min(1).max(80),
  description: z.string().trim().max(180).default(""),
  amountCents: z.number().int().positive().max(10_000_000),
  occurredOn: isoDateSchema,
  category: categorySchema.optional(),
  source: z.enum(["manual", "csv"]).default("manual"),
});

export const updateTransactionSchema = createTransactionSchema
  .partial()
  .extend({ confidence: z.number().min(0).max(1).optional() })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one change.");

export const importTransactionSchema = createTransactionSchema.extend({
  id: z.string().max(100).optional(),
});

export const importTransactionsSchema = z.object({
  transactions: z.array(importTransactionSchema).min(1).max(500),
  skipDuplicates: z.boolean().default(true),
});

export const budgetUpdateSchema = z.object({
  month: monthSchema,
  budgets: z
    .array(
      z.object({
        category: categorySchema,
        limitCents: z.number().int().nonnegative().max(100_000_000),
      }),
    )
    .min(1)
    .max(categories.length),
});

export const goalUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).default("Emergency cushion"),
  kind: z.enum(["emergency", "semester"]).default("emergency"),
  targetCents: z.number().int().positive().max(100_000_000),
  currentCents: z.number().int().nonnegative().max(100_000_000),
  targetDate: isoDateSchema.nullable().optional(),
});

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  semesterStart: isoDateSchema,
  semesterEnd: isoDateSchema,
  monthlyAllowanceCents: z.number().int().nonnegative().max(100_000_000),
  budgets: budgetUpdateSchema.shape.budgets,
  goal: goalUpdateSchema,
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  monthlyAllowanceCents: z.number().int().nonnegative().max(100_000_000).optional(),
});

export const demoCoachRequestSchema = z.object({
  demo: z.literal(true),
  month: monthSchema,
  monthlyBudgetCents: z.number().int().positive(),
  totalSpentCents: z.number().int().nonnegative(),
  forecastCents: z.number().int().nonnegative(),
  categoryHealth: z.array(
    z.object({
      category: categorySchema,
      spentCents: z.number().int().nonnegative(),
      limitCents: z.number().int().nonnegative(),
    }),
  ),
  goal: z
    .object({
      name: z.string().max(80),
      targetCents: z.number().int().positive(),
      currentCents: z.number().int().nonnegative(),
    })
    .nullable(),
});

export { isoDateSchema, monthSchema };
