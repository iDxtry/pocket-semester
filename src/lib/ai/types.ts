import { z } from "zod";
import { categories } from "@/lib/budget";

export const expenseAnalysisSchema = z.object({
  category: z.enum(categories),
  confidence: z.number().min(0).max(1),
  insight: z.string().trim().min(1).max(240),
  action: z.string().trim().min(1).max(180),
});

export const aiSourceSchema = z.enum(["openai", "gemini", "local"]);

export const analysisResultSchema = expenseAnalysisSchema.extend({
  source: aiSourceSchema,
  model: z.string().trim().min(1).max(120).nullable(),
});

export const coachContextSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  monthlyBudgetCents: z.number().int().positive(),
  totalSpentCents: z.number().int().nonnegative(),
  forecastCents: z.number().int().nonnegative(),
  categoryHealth: z.array(
    z.object({
      category: z.enum(categories),
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

export const coachPlanSchema = z.object({
  summary: z.string().trim().min(1).max(320),
  watchouts: z
    .array(
      z.object({
        category: z.enum(categories),
        message: z.string().trim().min(1).max(180),
      }),
    )
    .max(3),
  actions: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        detail: z.string().trim().min(1).max(220),
        estimatedImpactCents: z.number().int().min(0).max(10_000_000),
      }),
    )
    .min(2)
    .max(3),
  estimatedImpactCents: z.number().int().min(0).max(10_000_000),
});

export type ExpenseAnalysis = z.infer<typeof analysisResultSchema>;
export type CoachContext = z.infer<typeof coachContextSchema>;
export type CoachPlan = z.infer<typeof coachPlanSchema>;
export type AiSource = z.infer<typeof aiSourceSchema>;

export type CoachResult =
  | { status: "ready"; plan: CoachPlan; source: Exclude<AiSource, "local">; model: string }
  | { status: "unavailable"; reason: string };
