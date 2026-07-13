import { categories, type Category } from "@/lib/budget";
import type { z } from "zod";
import { analysisResultSchema, coachContextSchema, coachPlanSchema, type CoachContext, type CoachResult, type ExpenseAnalysis } from "@/lib/ai/types";
import type { expenseAnalysisRequestSchema } from "@/lib/validation";

const GEMINI_DEFAULT_MODEL = "gemini-3.1-flash-lite";

const categoryRules: Array<[Category, RegExp]> = [
  ["Food & dining", /coffee|cafe|restaurant|grocery|market|pizza|lunch|dinner|snack|meal/i],
  ["Housing", /rent|hall|housing|utility|electric|internet/i],
  ["Transport", /metro|transit|bus|train|uber|lyft|gas|parking/i],
  ["School", /book|course|tuition|school|lab|print|supplies/i],
  ["Subscriptions", /subscription|spotify|netflix|stream|membership|cloud/i],
  ["Fun", /movie|concert|game|bowling|museum|ticket/i],
];

type AnalysisInput = z.infer<typeof expenseAnalysisRequestSchema>;

function configuredProvider() {
  return process.env.AI_PROVIDER ?? (process.env.GEMINI_API_KEY ? "gemini" : "local");
}

function geminiModel() {
  return process.env.GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL;
}

export function getLocalExpenseAnalysis(input: AnalysisInput): ExpenseAnalysis {
  const text = `${input.merchant} ${input.description}`;
  const category = categoryRules.find(([, pattern]) => pattern.test(text))?.[0] ?? "Other";
  const projectedCents = input.monthlySpentCents + input.amountCents;
  const remainingCents = Math.max(input.monthlyBudgetCents - projectedCents, 0);
  const percent = Math.round((projectedCents / input.monthlyBudgetCents) * 100);

  return {
    category,
    confidence: category === "Other" ? 0.58 : 0.88,
    insight: `This expense puts you at ${percent}% of this month’s plan, with $${(remainingCents / 100).toFixed(0)} left.`,
    action:
      category === "Food & dining"
        ? "Plan two lower-cost meals this week to protect your flexible spending."
        : "Check this category before your next non-essential purchase.",
    source: "local",
  };
}

async function geminiJson<T>(prompt: string, schema: { parse: (value: unknown) => T }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini is not configured.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (!response.ok) throw new Error(`Gemini request failed with ${response.status}.`);

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini returned no structured result.");

  return schema.parse(JSON.parse(text));
}

export async function analyzeExpense(input: AnalysisInput): Promise<ExpenseAnalysis> {
  const fallback = getLocalExpenseAnalysis(input);
  if (configuredProvider() !== "gemini" || !process.env.GEMINI_API_KEY) return fallback;

  const prompt = `You are a careful budgeting assistant for university students.
Categorize one expense and recommend one concrete, non-judgmental next step.

Expense:
- Merchant: ${input.merchant}
- Description: ${input.description || "None provided"}
- Amount: $${(input.amountCents / 100).toFixed(2)}
- Spent this month before expense: $${(input.monthlySpentCents / 100).toFixed(2)}
- Monthly budget: $${(input.monthlyBudgetCents / 100).toFixed(2)}

Return only JSON matching this exact shape:
{"category":"one of: ${categories.join(", ")}","confidence":0.0,"insight":"max 240 chars","action":"max 180 chars"}`;

  try {
    const result = await geminiJson(prompt, {
      parse: (value) => analysisResultSchema.omit({ source: true }).parse(value),
    });
    return { ...result, source: "gemini" };
  } catch (error) {
    console.error("Expense analysis unavailable", error instanceof Error ? error.message : "Unknown provider error");
    return fallback;
  }
}

export async function generateCoachPlan(context: CoachContext): Promise<CoachResult> {
  const parsed = coachContextSchema.parse(context);
  if (configuredProvider() !== "gemini" || !process.env.GEMINI_API_KEY) {
    return { status: "unavailable", reason: "AI coaching is not configured yet." };
  }

  const prompt = `You are Pocket Semester’s thoughtful budget coach for university students.
Use only the aggregate budget facts below. Give practical, non-judgmental guidance. Do not provide investment, tax, credit, or legal advice.

Monthly budget data:
${JSON.stringify(parsed)}

Return only JSON matching this exact shape:
{
  "summary":"max 320 chars",
  "watchouts":[{"category":"one listed category","message":"max 180 chars"}],
  "actions":[{"title":"max 80 chars","detail":"max 220 chars","estimatedImpactCents":0}],
  "estimatedImpactCents":0
}

Return 2 or 3 actions. Each action should be specific to this month and use a conservative dollar estimate in cents.`;

  try {
    const plan = await geminiJson(prompt, coachPlanSchema);
    return { status: "ready", plan, source: "gemini", model: geminiModel() };
  } catch (error) {
    console.error("Coach plan unavailable", error instanceof Error ? error.message : "Unknown provider error");
    return {
      status: "unavailable",
      reason: "Your personalized plan could not be refreshed. Your transactions and budget are still saved.",
    };
  }
}
